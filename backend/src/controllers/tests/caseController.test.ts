import { Response } from "express";
import {
  createCase,
  updateCase,
  deleteCase,
  addComment,
  getCases,
  getPinnedComments,
  toggleRepostPermission,
  repostCase,
  reviewAICasePost,
  publishDueAICasePosts,
} from "../caseController";
import { AuthRequest } from "../../middleware/auth";
import Case from "../../models/Case";
import User from "../../models/User";
import Notification from "../../models/Notification";
import AICasePostSchedule from "../../models/AICasePostSchedule";
import { analyzeCase } from "../../services/aiTaggerService";
import { createAndEmitNotification } from "../notificationController";
import { enqueueCaseModeration } from "../../jobs/caseModerationJob";

jest.mock("../../utils/asyncHandler", () => ({
  asyncHandler: (fn: any) => fn,
}));

jest.mock("../../models/Case");
jest.mock("../../models/User");
jest.mock("../../models/Notification");
jest.mock("../../models/AICasePostSchedule");
jest.mock("../../services/aiTaggerService");
jest.mock("../../services/ragService", () => ({
  ingestCase: jest.fn().mockResolvedValue(undefined),
  suggestCases: jest.fn().mockResolvedValue([]),
}));
jest.mock("../notificationController");
jest.mock("../../jobs/caseModerationJob", () => ({
  enqueueCaseModeration: jest.fn(),
}));

const mockedCase = Case as jest.Mocked<typeof Case>;
const mockedUser = User as jest.Mocked<typeof User>;
const mockedAnalyzeCase = analyzeCase as jest.Mock;
const mockedCreateAndEmitNotification = createAndEmitNotification as jest.Mock;
const mockedEnqueueCaseModeration = enqueueCaseModeration as jest.Mock;
const mockedAICasePostSchedule = AICasePostSchedule as jest.Mocked<typeof AICasePostSchedule>;

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
    mockedEnqueueCaseModeration.mockResolvedValue(undefined);
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
        pointsAwarded: 0,
        doctor: "patient-1",
      }));
      expect(mockedUser.findByIdAndUpdate).not.toHaveBeenCalled();
      expect(mockedEnqueueCaseModeration).toHaveBeenCalledWith("patient-1");
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it("creates a doctor case with moderation pending and queues it", async () => {
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
        moderationStatus: "pending",
        pointsAwarded: 0,
      }));
      expect(mockedUser.findByIdAndUpdate).not.toHaveBeenCalled();
      expect(mockedEnqueueCaseModeration).toHaveBeenCalledWith("new-case-id");
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

  describe("toggleRepostPermission", () => {
    it("toggles canRepost from false to true", async () => {
      mockedCase.findById.mockResolvedValue({
        _id: "case-123",
        doctor: { toString: () => "doctor-1" },
        canRepost: false,
      } as any);
      mockedCase.findByIdAndUpdate.mockResolvedValue({} as any);

      const req = mockRequest("doctor-1", "doctor", { id: "case-123" });
      const res = mockResponse();

      await toggleRepostPermission(req as any, res as any, jest.fn());

      expect(mockedCase.findByIdAndUpdate).toHaveBeenCalledWith("case-123", { $set: { canRepost: true } });
      expect(res.json).toHaveBeenCalledWith({ success: true, data: { canRepost: true } });
    });

    it("toggles canRepost from true to false", async () => {
      mockedCase.findById.mockResolvedValue({
        _id: "case-123",
        doctor: { toString: () => "doctor-1" },
        canRepost: true,
      } as any);
      mockedCase.findByIdAndUpdate.mockResolvedValue({} as any);

      const req = mockRequest("doctor-1", "doctor", { id: "case-123" });
      const res = mockResponse();

      await toggleRepostPermission(req as any, res as any, jest.fn());

      expect(mockedCase.findByIdAndUpdate).toHaveBeenCalledWith("case-123", { $set: { canRepost: false } });
      expect(res.json).toHaveBeenCalledWith({ success: true, data: { canRepost: false } });
    });

    it("returns 403 if the user is not the case author", async () => {
      mockedCase.findById.mockResolvedValue({
        doctor: { toString: () => "doctor-1" },
        canRepost: false,
      } as any);

      const req = mockRequest("doctor-2", "doctor", { id: "case-123" });
      const res = mockResponse();

      await expect(
        toggleRepostPermission(req as any, res as any, jest.fn())
      ).rejects.toThrow("Only the case author can change repost permissions");
    });

    it("returns 404 if the case does not exist", async () => {
      mockedCase.findById.mockResolvedValue(null);

      const req = mockRequest("doctor-1", "doctor", { id: "missing" });
      const res = mockResponse();

      await expect(
        toggleRepostPermission(req as any, res as any, jest.fn())
      ).rejects.toThrow("Case not found");
    });
  });

  describe("repostCase", () => {
    const originalCaseData = {
      _id: "case-123",
      title: "Original Case",
      description: "A medical case",
      symptoms: ["fever", "cough"],
      patientInfo: { age: 45, gender: "male" },
      difficulty: "intermediate",
      specialization: "Cardiology",
      tags: ["heart", "cardiology"],
      images: ["img1.jpg"],
      attachments: [{ url: "http://example.com/file.pdf", type: "image" }],
      diagnosis: "Hypertension",
      treatment: "Beta blockers",
      isRareDisease: false,
      doctor: { toString: () => "original-doctor" },
      canRepost: true,
    };

    it("creates a repost when canRepost is true", async () => {
      mockedCase.findById.mockResolvedValue({ ...originalCaseData } as any);
      mockedCase.create.mockResolvedValue({ _id: "repost-1" } as any);

      const req = mockRequest("user-2", "doctor", { id: "case-123" });
      const res = mockResponse();

      await repostCase(req as any, res as any, jest.fn());

      expect(mockedCase.create).toHaveBeenCalledWith(expect.objectContaining({
        title: "Repost: Original Case",
        description: "A medical case",
        doctor: "user-2",
      }));
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it("creates the repost as pending and enqueues moderation", async () => {
      mockedCase.findById.mockResolvedValue({ ...originalCaseData } as any);
      mockedCase.create.mockResolvedValue({ _id: "repost-1" } as any);

      const req = mockRequest("user-2", "intern", { id: "case-123" });
      const res = mockResponse();

      await repostCase(req as any, res as any, jest.fn());

      const createCall = (mockedCase.create as jest.Mock).mock.calls[0][0];
      expect(createCall.moderationStatus).toBe("pending");
      expect(createCall.moderationStatus).not.toBe("approved");
      expect(mockedEnqueueCaseModeration).toHaveBeenCalledWith("repost-1");
    });

    it("copies required schema fields: difficulty and specialization", async () => {
      mockedCase.findById.mockResolvedValue({ ...originalCaseData } as any);
      mockedCase.create.mockResolvedValue({ _id: "repost-1" } as any);

      const req = mockRequest("user-2", "doctor", { id: "case-123" });
      const res = mockResponse();

      await repostCase(req as any, res as any, jest.fn());

      expect(mockedCase.create).toHaveBeenCalledWith(expect.objectContaining({
        difficulty: "intermediate",
        specialization: "Cardiology",
      }));
    });

    it("copies optional medical metadata fields", async () => {
      mockedCase.findById.mockResolvedValue({ ...originalCaseData } as any);
      mockedCase.create.mockResolvedValue({ _id: "repost-1" } as any);

      const req = mockRequest("user-2", "doctor", { id: "case-123" });
      const res = mockResponse();

      await repostCase(req as any, res as any, jest.fn());

      expect(mockedCase.create).toHaveBeenCalledWith(expect.objectContaining({
        tags: ["heart", "cardiology"],
        images: ["img1.jpg"],
        attachments: [{ url: "http://example.com/file.pdf", type: "image" }],
        diagnosis: "Hypertension",
        treatment: "Beta blockers",
        isRareDisease: false,
      }));
    });

    it("sets the repost owner to the requesting user", async () => {
      mockedCase.findById.mockResolvedValue({ ...originalCaseData } as any);
      mockedCase.create.mockResolvedValue({ _id: "repost-1" } as any);

      const req = mockRequest("user-2", "doctor", { id: "case-123" });
      const res = mockResponse();

      await repostCase(req as any, res as any, jest.fn());

      const createCall = (mockedCase.create as jest.Mock).mock.calls[0][0];
      expect(createCall.doctor.toString()).toBe("user-2");
      expect(createCall.doctor.toString()).not.toBe("original-doctor");
    });

    it("returns 400 when canRepost is false", async () => {
      mockedCase.findById.mockResolvedValue({
        ...originalCaseData,
        canRepost: false,
      } as any);

      const req = mockRequest("user-2", "doctor", { id: "case-123" });
      const res = mockResponse();

      await expect(
        repostCase(req as any, res as any, jest.fn())
      ).rejects.toThrow("This case cannot be reposted per author restrictions");
    });

    it("returns 404 for a nonexistent case", async () => {
      mockedCase.findById.mockResolvedValue(null);

      const req = mockRequest("user-2", "doctor", { id: "missing" });
      const res = mockResponse();

      await expect(
        repostCase(req as any, res as any, jest.fn())
      ).rejects.toThrow("Case not found");
    });
  });

  describe("reviewAICasePost", () => {
    it("returns 403 when a doctor reviews another doctor's schedule", async () => {
      mockedAICasePostSchedule.findById.mockResolvedValue({
        _id: "schedule-1",
        author: { toString: () => "doctor-1" },
      } as any);

      const req = mockRequest("doctor-2", "doctor", { scheduleId: "schedule-1" }, { reviewStatus: "approved" });
      const res = mockResponse();

      await expect(
        reviewAICasePost(req as any, res as any, jest.fn())
      ).rejects.toThrow("You can only review your own AI case schedules");

      expect(mockedAICasePostSchedule.findByIdAndUpdate).not.toHaveBeenCalled();
    });

    it("allows the owning doctor to review their own schedule", async () => {
      mockedAICasePostSchedule.findById.mockResolvedValue({
        _id: "schedule-1",
        author: { toString: () => "doctor-1" },
      } as any);
      const updatedSchedule = { _id: "schedule-1", reviewStatus: "approved" };
      mockedAICasePostSchedule.findByIdAndUpdate.mockResolvedValue(updatedSchedule as any);

      const req = mockRequest("doctor-1", "doctor", { scheduleId: "schedule-1" }, { reviewStatus: "approved" });
      const res = mockResponse();

      await reviewAICasePost(req as any, res as any, jest.fn());

      expect(mockedAICasePostSchedule.findByIdAndUpdate).toHaveBeenCalledWith(
        "schedule-1",
        expect.objectContaining({ reviewStatus: "approved", reviewedBy: "doctor-1" }),
        expect.anything()
      );
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, data: { schedule: updatedSchedule } })
      );
    });

    it("allows an admin to review any schedule", async () => {
      mockedAICasePostSchedule.findById.mockResolvedValue({
        _id: "schedule-1",
        author: { toString: () => "doctor-1" },
      } as any);
      mockedAICasePostSchedule.findByIdAndUpdate.mockResolvedValue({
        _id: "schedule-1",
        reviewStatus: "rejected",
      } as any);

      const req = mockRequest("admin-1", "admin", { scheduleId: "schedule-1" }, { reviewStatus: "rejected" });
      const res = mockResponse();

      await reviewAICasePost(req as any, res as any, jest.fn());

      expect(mockedAICasePostSchedule.findByIdAndUpdate).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });
  });

  describe("publishDueAICasePosts", () => {
    const mockSchedule = (_id: string, author: string) => ({
      _id,
      author,
      generatedCase: {
        title: "AI Case",
        description: "desc",
        symptoms: [],
        patientInfo: {},
        diagnosis: "diag",
        treatment: "tx",
        tags: [],
        difficulty: "intermediate",
        specialization: "Cardiology",
      },
      reviewedBy: "admin-1",
      reviewedAt: new Date(),
      nextRunAt: new Date(),
      interval: "weekly",
      isActive: true,
      save: jest.fn().mockResolvedValue(undefined),
    });

    it("non-admin doctor only publishes schedules they own or that were admin-approved", async () => {
      mockedUser.find.mockReturnValue({
        select: jest.fn().mockResolvedValue([{ _id: "admin-1" }]),
      } as any);
      const owned = mockSchedule("schedule-1", "doctor-1");
      mockedAICasePostSchedule.find.mockReturnValue({
        limit: jest.fn().mockResolvedValue([owned]),
      } as any);
      (mockedCase.create as jest.Mock).mockResolvedValue({ _id: "case-1" } as any);

      const req = mockRequest("doctor-1", "doctor");
      const res = mockResponse();

      await publishDueAICasePosts(req as any, res as any, jest.fn());

      const findCall = (mockedAICasePostSchedule.find as jest.Mock).mock.calls[0][0];
      expect(findCall.$or).toEqual([
        { author: "doctor-1" },
        { reviewedBy: { $in: ["admin-1"] } },
      ]);
      expect(mockedCase.create).toHaveBeenCalledWith(
        expect.objectContaining({ title: "AI Case", doctor: "doctor-1" })
      );
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, data: expect.objectContaining({ count: 1 }) })
      );
    });

    it("admin can publish any approved due schedule without the ownership filter", async () => {
      const schedule = mockSchedule("schedule-1", "doctor-9");
      mockedAICasePostSchedule.find.mockReturnValue({
        limit: jest.fn().mockResolvedValue([schedule]),
      } as any);
      (mockedCase.create as jest.Mock).mockResolvedValue({ _id: "case-1" } as any);
      (schedule as any).save = jest.fn().mockResolvedValue(undefined);

      const req = mockRequest("admin-1", "admin");
      const res = mockResponse();

      await publishDueAICasePosts(req as any, res as any, jest.fn());

      const findCall = (mockedAICasePostSchedule.find as jest.Mock).mock.calls[0][0];
      expect(findCall.$or).toBeUndefined();
      expect(mockedCase.create).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, data: expect.objectContaining({ count: 1 }) })
      );
    });
  });
});
