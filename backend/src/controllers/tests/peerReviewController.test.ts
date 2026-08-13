import { Response } from "express";
import mongoose from "mongoose";
import { submitPeerReview, getUserReviews, getReviewsByUser, getPeerReviewAnalytics } from "../peerReviewController";
import PeerReview from "../../models/PeerReview";
import User from "../../models/User";
import Case from "../../models/Case";
import { createAndEmitNotification } from "../notificationController";
import { AuthRequest } from "../../middleware/auth";

jest.mock("../../models/PeerReview");
jest.mock("../../models/User");
jest.mock("../../models/Case");
jest.mock("../notificationController");

const mockedPeerReview = PeerReview as unknown as jest.Mocked<typeof PeerReview>;
const mockedUser = User as unknown as jest.Mocked<typeof User>;
const mockedCase = Case as unknown as jest.Mocked<typeof Case>;
const mockedNotification = createAndEmitNotification as jest.Mock;

const mockResponse = () => {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res as Response;
};

const mockRequest = (userId: string, userType: string, body: any = {}): AuthRequest => ({
  user: { _id: userId, userType },
  body,
}) as unknown as AuthRequest;

describe("Peer Review Controller", () => {
  const mockSession = {
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    abortTransaction: jest.fn(),
    endSession: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(mongoose, "startSession").mockResolvedValue(mockSession as any);
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  describe("submitPeerReview", () => {
    it("rejects review if reviewer is the reviewee", async () => {
      const req = mockRequest("intern-1", "intern", { revieweeId: "intern-1" });
      const res = mockResponse();

      await submitPeerReview(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: "Cannot review your own work" }));
    });

    it("rejects review if reviewer is not an intern or admin", async () => {
      const req = mockRequest("doc-1", "doctor", { revieweeId: "intern-2" });
      const res = mockResponse();

      await submitPeerReview(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining("Only interns or admins can submit") }));
    });

    it("rejects duplicate review for the same commentId", async () => {
      const revieweeId = "507f1f77bcf86cd799439011";
      const req = mockRequest("intern-1", "intern", { revieweeId, caseId: "case-1", commentId: "comment-1" });
      const res = mockResponse();

      mockedCase.findById.mockResolvedValue({
        _id: "case-1",
        comments: [{ _id: "comment-1", author: { toString: () => revieweeId } }]
      } as any);

      mockedPeerReview.findOne.mockResolvedValue({ _id: "existing-review" } as any);

      await submitPeerReview(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: "You have already reviewed this comment" }));
    });

    it("rejects review when revieweeId does not match the comment author", async () => {
      const req = mockRequest("intern-1", "intern", {
        revieweeId: "65f0000000000000000000aa",
        caseId: "case-1",
        commentId: "comment-1",
        rating: 1,
        feedback: "bad",
      });
      const res = mockResponse();

      mockedCase.findById.mockResolvedValue({
        _id: "case-1",
        comments: [{ _id: "comment-1", author: { toString: () => "intern-2" } }]
      } as any);

      await submitPeerReview(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, message: "Reviewee must be the author of the comment being reviewed" })
      );
      expect(mockedPeerReview.create).not.toHaveBeenCalled();
      expect(mockedUser.findByIdAndUpdate).not.toHaveBeenCalled();
    });

    it("successfully creates review, calculates average rating, and sends notification", async () => {
      const revieweeId = "507f1f77bcf86cd799439011";
      const req = mockRequest("intern-1", "intern", {
        revieweeId,
        caseId: "case-1",
        commentId: "comment-1",
        rating: 4,
      });
      const res = mockResponse();

      mockedCase.findById.mockResolvedValue({
        _id: "case-1",
        comments: [{ _id: "comment-1", author: { toString: () => revieweeId } }]
      } as any);

      mockedPeerReview.findOne.mockResolvedValue(null);

      const newReview = { _id: "review-1", rating: 4, populate: jest.fn().mockResolvedValue(true) };
      mockedPeerReview.create.mockResolvedValue([newReview] as any);

      // Mock the aggregation pipeline result: current review (rating 4) +
      // old review (rating 5) = average 4.5
      mockedPeerReview.aggregate.mockReturnValue({
        session: jest.fn().mockResolvedValue([{ _id: null, avg: 4.5, count: 2 }])
      } as any);

      await submitPeerReview(req as any, res as any);

      expect(mockSession.startTransaction).toHaveBeenCalled();
      expect(mockedPeerReview.create).toHaveBeenCalledWith([{
        reviewer: "intern-1",
        reviewee: revieweeId,
        caseId: "case-1",
        commentId: "comment-1",
        rating: 4,
        feedback: undefined,
        comments: undefined,
        tags: undefined
      }], { session: mockSession });

      expect(mockedUser.findByIdAndUpdate).toHaveBeenCalledWith("intern-1", {
        $inc: { peerReviewsGiven: 1 }
      }, { session: mockSession });

      expect(mockedUser.findByIdAndUpdate).toHaveBeenCalledWith(revieweeId, {
        $inc: { peerReviewsReceived: 1 },
        $set: { averageRating: 4.5 }
      }, { session: mockSession });

      expect(mockSession.commitTransaction).toHaveBeenCalled();
      expect(mockSession.endSession).toHaveBeenCalled();

      expect(mockedNotification).toHaveBeenCalledWith(expect.objectContaining({
        recipientId: revieweeId,
        type: "peer_review"
      }));

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it("retries the transaction when a transient transaction error occurs and recomputes the average on a fresh snapshot", async () => {
      const revieweeId = "507f1f77bcf86cd799439011";
      const req = mockRequest("intern-1", "intern", {
        revieweeId,
        caseId: "case-1",
        commentId: "comment-1",
        rating: 4,
      });
      const res = mockResponse();

      mockedCase.findById.mockResolvedValue({
        _id: "case-1",
        comments: [{ _id: "comment-1", author: { toString: () => revieweeId } }]
      } as any);

      mockedPeerReview.findOne.mockResolvedValue(null);

      const newReview = { _id: "review-1", rating: 4, populate: jest.fn().mockResolvedValue(true) };
      mockedPeerReview.create.mockResolvedValue([newReview] as any);

      // First commit conflicts with a concurrent review (TransientTransactionError),
      // the retry re-reads the snapshot and commits successfully.
      mockSession.commitTransaction
        .mockRejectedValueOnce({ hasErrorLabel: (label: string) => label === "TransientTransactionError" })
        .mockResolvedValueOnce(undefined);

      // Attempt 1 only sees the new review; attempt 2 (after retry) sees both.
      mockedPeerReview.aggregate
        .mockReturnValueOnce({ session: jest.fn().mockResolvedValue([{ _id: null, avg: 4, count: 1 }]) } as any)
        .mockReturnValueOnce({ session: jest.fn().mockResolvedValue([{ _id: null, avg: 4.5, count: 2 }]) } as any);

      await submitPeerReview(req as any, res as any);

      expect(mockSession.commitTransaction).toHaveBeenCalledTimes(2);
      expect(mockedPeerReview.aggregate).toHaveBeenCalledTimes(2);
      // Final average must come from the up-to-date snapshot.
      expect(mockedUser.findByIdAndUpdate).toHaveBeenLastCalledWith(revieweeId, {
        $inc: { peerReviewsReceived: 1 },
        $set: { averageRating: 4.5 }
      }, { session: mockSession });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it("does not retry and returns 500 when a non-transient error occurs", async () => {
      const revieweeId = "507f1f77bcf86cd799439011";
      const req = mockRequest("intern-1", "intern", {
        revieweeId,
        caseId: "case-1",
        commentId: "comment-1",
        rating: 4,
      });
      const res = mockResponse();

      mockedCase.findById.mockResolvedValue({
        _id: "case-1",
        comments: [{ _id: "comment-1", author: { toString: () => revieweeId } }]
      } as any);

      mockedPeerReview.findOne.mockResolvedValue(null);

      const newReview = { _id: "review-1", rating: 4, populate: jest.fn().mockResolvedValue(true) };
      mockedPeerReview.create.mockResolvedValue([newReview] as any);

      mockedPeerReview.aggregate.mockReturnValue({
        session: jest.fn().mockResolvedValue([{ _id: null, avg: 4, count: 1 }])
      } as any);

      mockSession.commitTransaction.mockRejectedValue(new Error("boom"));

      await submitPeerReview(req as any, res as any);

      expect(mockSession.commitTransaction).toHaveBeenCalledTimes(1);
      expect(mockedPeerReview.aggregate).toHaveBeenCalledTimes(1);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe("getUserReviews", () => {
    const targetUserId = "507f1f77bcf86cd799439011";

    const mockReviewsQuery = (reviews: any[]) => ({
      populate: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue(reviews),
    }) as any;

    it("rejects viewing another user's received reviews", async () => {
      const req = {
        params: { userId: targetUserId },
        query: {},
        user: { _id: "507f1f77bcf86cd799439012", userType: "intern" },
      } as any;
      const res = mockResponse();

      await getUserReviews(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, message: "Access denied" })
      );
      expect(mockedPeerReview.find).not.toHaveBeenCalled();
    });

    it("allows a user to view their own received reviews", async () => {
      const req = {
        params: { userId: targetUserId },
        query: { page: "1", limit: "10" },
        user: { _id: targetUserId, userType: "intern" },
      } as any;
      const res = mockResponse();

      const reviews = [{ _id: "r1", rating: 4 }];
      mockedPeerReview.find.mockReturnValue(mockReviewsQuery(reviews));
      mockedPeerReview.countDocuments.mockResolvedValue(1);

      await getUserReviews(req as any, res as any);

      expect(mockedPeerReview.find).toHaveBeenCalledWith({ reviewee: targetUserId });
      expect(res.status).not.toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, data: expect.objectContaining({ total: 1 }) })
      );
    });

    it("allows an admin to view any user's received reviews", async () => {
      const req = {
        params: { userId: targetUserId },
        query: {},
        user: { _id: "507f1f77bcf86cd799439013", userType: "admin" },
      } as any;
      const res = mockResponse();

      mockedPeerReview.find.mockReturnValue(mockReviewsQuery([]));
      mockedPeerReview.countDocuments.mockResolvedValue(0);

      await getUserReviews(req as any, res as any);

      expect(mockedPeerReview.find).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });
  });

  describe("getReviewsByUser", () => {
    const targetUserId = "507f1f77bcf86cd799439011";

    it("rejects viewing another user's given reviews", async () => {
      const req = {
        params: { userId: targetUserId },
        query: {},
        user: { _id: "507f1f77bcf86cd799439012", userType: "intern" },
      } as any;
      const res = mockResponse();

      await getReviewsByUser(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, message: "Access denied" })
      );
      expect(mockedPeerReview.find).not.toHaveBeenCalled();
    });

    it("allows a user to view their own given reviews", async () => {
      const req = {
        params: { userId: targetUserId },
        query: { page: "1", limit: "10" },
        user: { _id: targetUserId, userType: "intern" },
      } as any;
      const res = mockResponse();

      const reviews = [{ _id: "r1", rating: 5 }];
      mockedPeerReview.find.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue(reviews),
      } as any);
      mockedPeerReview.countDocuments.mockResolvedValue(1);

      await getReviewsByUser(req as any, res as any);

      expect(mockedPeerReview.find).toHaveBeenCalledWith({ reviewer: targetUserId });
      expect(res.status).not.toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, data: expect.objectContaining({ total: 1 }) })
      );
    });

    it("allows an admin to view any user's given reviews", async () => {
      const req = {
        params: { userId: targetUserId },
        query: {},
        user: { _id: "507f1f77bcf86cd799439013", userType: "admin" },
      } as any;
      const res = mockResponse();

      mockedPeerReview.find.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([]),
      } as any);
      mockedPeerReview.countDocuments.mockResolvedValue(0);

      await getReviewsByUser(req as any, res as any);

      expect(mockedPeerReview.find).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });
  });

  describe("getPeerReviewAnalytics", () => {
    const targetUserId = "507f1f77bcf86cd799439011";

    it("rejects viewing another user's analytics", async () => {
      const req = {
        params: { userId: targetUserId },
        user: { _id: "507f1f77bcf86cd799439012", userType: "intern" },
      } as any;
      const res = mockResponse();

      await getPeerReviewAnalytics(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, message: "Access denied" })
      );
      expect(mockedPeerReview.find).not.toHaveBeenCalled();
    });

    it("allows a user to view their own analytics", async () => {
      const req = {
        params: { userId: targetUserId },
        user: { _id: targetUserId, userType: "intern" },
      } as any;
      const res = mockResponse();

      const received = [
        { rating: 4, createdAt: new Date("2025-01-10T10:00:00Z"), tags: ["accuracy", "clarity"] },
        { rating: 5, createdAt: new Date("2025-01-20T10:00:00Z"), tags: ["accuracy"] }
      ];
      const given = [
        { rating: 4, createdAt: new Date("2025-01-15T10:00:00Z"), tags: [] }
      ];
      mockedPeerReview.find
        .mockResolvedValueOnce(received as any)
        .mockResolvedValueOnce(given as any);

      await getPeerReviewAnalytics(req as any, res as any);

      expect(res.status).not.toHaveBeenCalledWith(403);
      const payload = (res.json as jest.Mock).mock.calls[0][0];
      expect(payload.success).toBe(true);
      expect(payload.data.analytics.reviewsReceived).toBe(2);
      expect(payload.data.analytics.reviewsGiven).toBe(1);
      expect(payload.data.analytics.averageRatingReceived).toBe(4.5);
      expect(payload.data.analytics.monthlyTrend["2025-01"].received).toBe(2);
      expect(payload.data.analytics.monthlyTrend["2025-01"].given).toBe(1);
      expect(payload.data.analytics.topTags.accuracy).toBe(2);
    });

    it("allows an admin to view any user's analytics", async () => {
      const req = {
        params: { userId: targetUserId },
        user: { _id: "507f1f77bcf86cd799439013", userType: "admin" },
      } as any;
      const res = mockResponse();

      mockedPeerReview.find.mockResolvedValue([] as any);

      await getPeerReviewAnalytics(req as any, res as any);

      expect(mockedPeerReview.find).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });
  });
});
