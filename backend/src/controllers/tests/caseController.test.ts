import { Response } from "express";
import {
  createCase,
  updateCase,
  deleteCase,
  addComment,
  getCases,
  getPinnedComments,
} from "../caseController";
import { AuthRequest } from "../../middleware/auth";
import Case from "../../models/Case";
import User from "../../models/User";
import Notification from "../../models/Notification";
import { analyzeCase } from "../../services/aiTaggerService";
import { createAndEmitNotification } from "../notificationController";

jest.mock("../../utils/asyncHandler", () => ({
  asyncHandler: (fn: any) => fn,
}));

jest.mock("../../models/Case");
jest.mock("../../models/User");
jest.mock("../../models/Notification");
jest.mock("../../services/aiTaggerService");
jest.mock("../../services/ragService", () => ({
  ingestCase: jest.fn().mockResolvedValue(undefined),
  suggestCases: jest.fn().mockResolvedValue([]),
}));
jest.mock("../notificationController");

const mockedCase = Case as jest.Mocked<typeof Case>;
const mockedUser = User as jest.Mocked<typeof User>;
const mockedAnalyzeCase = analyzeCase as jest.Mock;
const mockedCreateAndEmitNotification = createAndEmitNotification as jest.Mock;

const mockResponse = () => {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res as Response;
};

const mockRequest = (
  userId: string,
  userType: string,
  params: Record<string, string> = {},
  body: Record<string, any> = {},
  query: Record<string, any> = {}
): AuthRequest =>
  ({
    params,
    body,
    query,
    user: { _id: userId, userType },
  }) as unknown as AuthRequest;

describe("Case Controller", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("createCase", () => {
    it("creates a patient case with default moderation status as pending", async () => {
      mockedAnalyzeCase.mockResolvedValue({
        symptoms: ["headache"],
        diagnosis: "migraine",
        treatment: "rest",
        tags: ["neurology"],
        difficulty: "easy",
        specialty: "Neurology",
      });

      const req = mockRequest("patient-1", "patient", {}, {
        title: "Patient Case",
        description: "description",
      });
      const res = mockResponse();

      const save = jest.fn().mockResolvedValue(undefined);
      const populate = jest.fn().mockResolvedValue(undefined);
      (mockedCase as unknown as jest.Mock).mockImplementation(() => ({ save, populate, _id: "patient-1" }));
      mockedUser.findByIdAndUpdate.mockResolvedValue({} as any);

      const next = jest.fn();
      await createCase(req as any, res as any, next);

      expect(mockedCase).toHaveBeenCalledWith(expect.objectContaining({
        title: "Patient Case",
        isPatientCase: true,
        moderationStatus: "pending",
        doctor: "patient-1",
      }));
      expect(mockedUser.findByIdAndUpdate).toHaveBeenCalledWith("patient-1", {
        $inc: { points: 5 },
      });
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it("creates a doctor case with default moderation status as approved", async () => {
      mockedAnalyzeCase.mockResolvedValue({
        symptoms: [],
        diagnosis: "",
        treatment: "",
        tags: [],
        difficulty: "medium",
        specialty: "General",
      });

      const req = mockRequest("doctor-1", "doctor", {}, {
        title: "Doctor Case",
        description: "description",
      });
      const res = mockResponse();

      const save = jest.fn().mockResolvedValue(undefined);
      const populate = jest.fn().mockResolvedValue(undefined);
      (mockedCase as unknown as jest.Mock).mockImplementation(() => {
        return { save, populate, _id: "new-case-id" } as any;
      });
      mockedUser.findByIdAndUpdate.mockResolvedValue({} as any);
      mockedCase.findByIdAndUpdate.mockResolvedValue({} as any);

      const next = jest.fn();
      await createCase(req as any, res as any, next);

      expect(mockedCase).toHaveBeenCalledWith(expect.objectContaining({
        title: "Doctor Case",
        isPatientCase: false,
        moderationStatus: "approved",
      }));
      expect(mockedUser.findByIdAndUpdate).toHaveBeenCalledWith("doctor-1", {
        $inc: { points: 10 },
      });
      expect(res.status).toHaveBeenCalledWith(201);
    });
  });

  describe("updateCase", () => {
    it("returns 403 if the user is not the doctor who created the case", async () => {
      mockedCase.findById.mockResolvedValue({ doctor: { toString: () => "doctor-1" } } as any);

      const req = mockRequest("attacker-1", "doctor", { id: "case-123" }, { title: "Hacked" });
      const res = mockResponse();

      const next = jest.fn();
      await expect(updateCase(req as any, res as any, next)).rejects.toThrow("You can only update your own cases");
    });

    it("only sends allow-listed case fields to the update query", async () => {
      mockedCase.findById.mockResolvedValue({ doctor: { toString: () => "doctor-1" } } as any);
      const updatedMock = { _id: "case-123", title: "New Title" };
      
      const populateMock = jest.fn().mockResolvedValue(updatedMock);
      mockedCase.findByIdAndUpdate.mockReturnValue({ populate: populateMock } as any);

      const req = mockRequest("doctor-1", "doctor", { id: "case-123" }, {
        title: "New Title",
        tags: ["cardiology"],
        doctor: "attacker-1",
        comments: [],
        likes: ["attacker-1"],
        moderationStatus: "approved",
        moderationReason: "bypass",
        moderationAuditTrail: [],
        pointsAwarded: 999999,
        isActive: true,
      });
      const res = mockResponse();

      const next = jest.fn();
      await updateCase(req as any, res as any, next);

      expect(mockedCase.findByIdAndUpdate).toHaveBeenCalledWith(
        "case-123",
        expect.objectContaining({ title: "New Title", tags: ["cardiology"] }),
        expect.anything()
      );
      
      const updatesPassed = (mockedCase.findByIdAndUpdate as jest.Mock).mock.calls[0][1];
      expect(updatesPassed).not.toHaveProperty("doctor");
      expect(updatesPassed).not.toHaveProperty("comments");
      expect(updatesPassed).not.toHaveProperty("likes");
      expect(updatesPassed).not.toHaveProperty("moderationStatus");
      expect(updatesPassed).not.toHaveProperty("moderationReason");
      expect(updatesPassed).not.toHaveProperty("moderationAuditTrail");
      expect(updatesPassed).not.toHaveProperty("pointsAwarded");
      expect(updatesPassed).not.toHaveProperty("isActive");
    });
  });

  describe("deleteCase", () => {
    it("returns 403 if the user is not the doctor who created the case", async () => {
      mockedCase.findById.mockResolvedValue({ doctor: { toString: () => "doctor-1" } } as any);

      const req = mockRequest("attacker-1", "doctor", { id: "case-123" });
      const res = mockResponse();

      const next = jest.fn();
      await expect(deleteCase(req as any, res as any, next)).rejects.toThrow("You can only delete your own cases");
    });

    it("performs a soft delete by setting isActive to false", async () => {
      mockedCase.findById.mockResolvedValue({ doctor: { toString: () => "doctor-1" } } as any);
      mockedCase.findByIdAndUpdate.mockResolvedValue({} as any);

      const req = mockRequest("doctor-1", "doctor", { id: "case-123" });
      const res = mockResponse();

      const next = jest.fn();
      await deleteCase(req as any, res as any, next);

      expect(mockedCase.findByIdAndUpdate).toHaveBeenCalledWith("case-123", { isActive: false });
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });
  });

  describe("addComment", () => {
    it("prevents duplicate comments from the same user", async () => {
      const existingComments = [
        { author: { toString: () => "user-1" }, content: "Nice case" }
      ];
      mockedCase.findById.mockResolvedValue({ isActive: true, comments: existingComments } as any);

      const req = mockRequest("user-1", "doctor", { id: "case-123" }, { content: "Nice case" });
      const res = mockResponse();

      const next = jest.fn();
      await expect(addComment(req as any, res as any, next)).rejects.toThrow("Duplicate comment detected");
    });

    it("adds the comment and triggers notification for the case owner", async () => {
      const caseMock = {
        _id: "case-123",
        isActive: true,
        doctor: { toString: () => "doctor-1" },
        title: "Interesting Case",
        comments: [],
        save: jest.fn().mockResolvedValue(undefined),
        populate: jest.fn().mockResolvedValue(undefined),
      };
      mockedCase.findById.mockResolvedValue(caseMock as any);

      const req = mockRequest("user-2", "doctor", { id: "case-123" }, { content: "Great insight" });
      const res = mockResponse();

      const next = jest.fn();
      await addComment(req as any, res as any, next);

      expect(caseMock.comments).toHaveLength(1);
      expect(caseMock.comments[0]).toMatchObject({ content: "Great insight", author: "user-2" });
      expect(caseMock.save).toHaveBeenCalled();
      
      expect(mockedCreateAndEmitNotification).toHaveBeenCalledWith(expect.objectContaining({
        recipientId: "doctor-1",
        type: "comment",
      }));
    });
  });

  describe("getCases", () => {
    it("constructs filters correctly and applies pagination", async () => {
      const mockCases = [{ title: "Case 1" }];
      mockedCase.find.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue(mockCases),
      } as any);
      mockedCase.countDocuments.mockResolvedValue(1);

      const req = mockRequest("user-1", "doctor", {}, {}, {
        specialization: "Cardiology",
        difficulty: "hard",
        isRareDisease: "true",
        page: "2",
        limit: "5"
      });
      const res = mockResponse();

      const next = jest.fn();
      await getCases(req as any, res as any, next);

      expect(mockedCase.find).toHaveBeenCalledWith(expect.objectContaining({
        specialization: { $regex: "Cardiology", $options: "i" },
        difficulty: "hard",
        isRareDisease: true,
      }));

      const findChain = mockedCase.find();
      expect(findChain.skip).toHaveBeenCalledWith(5);
      expect(findChain.limit).toHaveBeenCalledWith(5);
      
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          cases: mockCases,
          pagination: expect.objectContaining({
            page: 2,
            limit: 5,
            total: 1,
            pages: 1,
          })
        })
      }));
    });
  });

  describe("getPinnedComments", () => {
    it("returns pinned comments for a valid caseId", async () => {
      const pinnedComment = { _id: "comment-1", content: "Pinned", isPinned: true };
      mockedCase.findById.mockResolvedValue({
        comments: [pinnedComment, { _id: "comment-2", content: "Regular", isPinned: false }],
      } as any);
      const req = mockRequest("user-1", "doctor", { caseId: "case-123" });
      const res = mockResponse();

      await getPinnedComments(req as any, res as any, jest.fn());

      expect(mockedCase.findById).toHaveBeenCalledWith("case-123");
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: { comments: [pinnedComment] },
      });
    });

    it("preserves the existing 404 response for a nonexistent case", async () => {
      mockedCase.findById.mockResolvedValue(null);
      const req = mockRequest("user-1", "doctor", { caseId: "missing-case" });
      const res = mockResponse();

      await expect(
        getPinnedComments(req as any, res as any, jest.fn())
      ).rejects.toMatchObject({ message: "Case not found", statusCode: 404 });
    });

    it("uses caseId rather than an unrelated id parameter", async () => {
      mockedCase.findById.mockResolvedValue({ comments: [] } as any);
      const req = mockRequest("user-1", "doctor", {
        caseId: "declared-case-id",
        id: "wrong-id",
      });
      const res = mockResponse();

      await getPinnedComments(req as any, res as any, jest.fn());

      expect(mockedCase.findById).toHaveBeenCalledWith("declared-case-id");
      expect(mockedCase.findById).not.toHaveBeenCalledWith("wrong-id");
    });
  });
});
