import { Response } from "express";
import { getLearningPaths, getLearningPathById, enrollInPath, completeStep } from "../learningPathController";
import LearningPath from "../../models/LearningPath";
import UserLearningPath from "../../models/UserLearningPath";
import UserBadge from "../../models/UserBadge";
import User from "../../models/User";
import Badge from "../../models/Badge";
import { createAndEmitNotification } from "../notificationController";
import { AppError } from "../../utils/AppError";

jest.mock("../../utils/asyncHandler", () => ({
  asyncHandler: (fn: any) => fn,
}));

jest.mock("../../models/LearningPath");
jest.mock("../../models/UserLearningPath");
jest.mock("../../models/UserBadge");
jest.mock("../../models/User");
jest.mock("../../models/Badge");
jest.mock("../notificationController");

const mockedLearningPath = LearningPath as unknown as jest.Mocked<typeof LearningPath>;
const mockedUserLearningPath = UserLearningPath as unknown as jest.Mocked<typeof UserLearningPath>;
const mockedUserBadge = UserBadge as unknown as jest.Mocked<typeof UserBadge>;
const mockedUser = User as unknown as jest.Mocked<typeof User>;
const mockedBadge = Badge as unknown as jest.Mocked<typeof Badge>;

const mockResponse = () => {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res as Response;
};

const mockRequest = (userId?: string, body: any = {}, params: any = {}) => {
  const req: any = { body, params };
  if (userId) {
    req.user = { _id: userId };
  }
  return req;
};

describe("Learning Path Controller", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getLearningPaths", () => {
    it("returns paths with progress for an authenticated user", async () => {
      const req = mockRequest("user-1");
      const res = mockResponse();

      const mockPaths = [{ _id: "path-1", title: "Path 1", toObject: () => ({ _id: "path-1", title: "Path 1" }) }];
      const mockPopulate = jest.fn().mockReturnThis();
      const mockSort = jest.fn().mockResolvedValue(mockPaths);
      
      mockedLearningPath.find.mockReturnValue({
        populate: mockPopulate,
        sort: mockSort
      } as any);

      mockedUserLearningPath.find.mockResolvedValue([{ learningPath: "path-1", completedSteps: [1] }] as any);

      await getLearningPaths(req as any, res as any, jest.fn());

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: {
          learningPaths: [
            expect.objectContaining({ _id: "path-1", progress: expect.any(Object) })
          ]
        }
      });
      expect(mockedUserLearningPath.find).toHaveBeenCalledWith({ user: "user-1" });
    });

    it("returns paths with no progress for an anonymous user", async () => {
      const req = mockRequest();
      const res = mockResponse();

      const mockPaths = [{ _id: "path-1", title: "Path 1", toObject: () => ({ _id: "path-1", title: "Path 1" }) }];
      mockedLearningPath.find.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockResolvedValue(mockPaths)
      } as any);

      await getLearningPaths(req as any, res as any, jest.fn());

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: {
          learningPaths: [
            expect.objectContaining({ _id: "path-1", progress: null })
          ]
        }
      });
      expect(mockedUserLearningPath.find).not.toHaveBeenCalled();
    });
  });

  describe("getLearningPathById", () => {
    it("returns a specific path with progress for an authenticated user", async () => {
      const req = mockRequest("user-1", {}, { id: "path-1" });
      const res = mockResponse();

      const mockPath = { _id: "path-1", title: "Path 1" };
      mockedLearningPath.findById.mockReturnValue({
        populate: jest.fn().mockReturnThis()
      } as any);
      (mockedLearningPath.findById as any)().populate.mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockPath)
      } as any);

      mockedUserLearningPath.findOne.mockResolvedValue({ learningPath: "path-1", isCompleted: true } as any);

      await getLearningPathById(req as any, res as any, jest.fn());

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: {
          learningPath: mockPath,
          progress: expect.any(Object)
        }
      });
      expect(mockedUserLearningPath.findOne).toHaveBeenCalledWith({ user: "user-1", learningPath: "path-1" });
    });

    it("returns a specific path with no progress for an anonymous user", async () => {
      const req = mockRequest(undefined, {}, { id: "path-1" });
      const res = mockResponse();

      const mockPath = { _id: "path-1", title: "Path 1" };
      mockedLearningPath.findById.mockReturnValue({
        populate: jest.fn().mockReturnThis()
      } as any);
      (mockedLearningPath.findById as any)().populate.mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockPath)
      } as any);

      await getLearningPathById(req as any, res as any, jest.fn());

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: {
          learningPath: mockPath,
          progress: null
        }
      });
      expect(mockedUserLearningPath.findOne).not.toHaveBeenCalled();
    });

    it("throws a 404 AppError if path is not found", async () => {
      const req = mockRequest("user-1", {}, { id: "not-found" });
      const res = mockResponse();

      mockedLearningPath.findById.mockReturnValue({
        populate: jest.fn().mockReturnThis()
      } as any);
      (mockedLearningPath.findById as any)().populate.mockReturnValue({
        populate: jest.fn().mockResolvedValue(null)
      } as any);

      await expect(getLearningPathById(req as any, res as any, jest.fn())).rejects.toThrow(AppError);
    });
  });

  describe("enrollInPath", () => {
    it("successfully enrolls a user in a path", async () => {
      const req = mockRequest("user-1", {}, { id: "path-1" });
      const res = mockResponse();

      mockedLearningPath.findById.mockResolvedValue({ _id: "path-1" } as any);
      mockedUserLearningPath.findOne.mockResolvedValue(null);
      mockedUserLearningPath.create.mockResolvedValue({ _id: "userpath-1" } as any);

      await enrollInPath(req as any, res as any, jest.fn());

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
      expect(mockedUserLearningPath.create).toHaveBeenCalledWith({
        user: "user-1",
        learningPath: "path-1",
        completedSteps: [],
        isCompleted: false
      });
    });

    it("throws a 401 AppError if not authenticated", async () => {
      const req = mockRequest(undefined, {}, { id: "path-1" });
      const res = mockResponse();

      await expect(enrollInPath(req as any, res as any, jest.fn())).rejects.toThrow(AppError);
    });

    it("throws a 400 AppError if already enrolled", async () => {
      const req = mockRequest("user-1", {}, { id: "path-1" });
      const res = mockResponse();

      mockedLearningPath.findById.mockResolvedValue({ _id: "path-1" } as any);
      mockedUserLearningPath.findOne.mockResolvedValue({ _id: "existing-enrollment" } as any);

      await expect(enrollInPath(req as any, res as any, jest.fn())).rejects.toThrow(AppError);
    });
  });

  describe("completeStep", () => {
    it("successfully completes a step, awards badge, and sends notification if path is fully completed", async () => {
      const req = mockRequest("user-1", { stepIndex: 0, answerIndex: 2 }, { id: "path-1" });
      const res = mockResponse();

      mockedLearningPath.findById.mockResolvedValue({ 
        _id: "path-1", 
        title: "Cool Path",
        badge: "badge-1",
        steps: [{ type: "quiz", quiz: { correctAnswer: 2 } }] 
      } as any);

      const mockSave = jest.fn();
      const mockProgress = {
        isCompleted: false,
        completedSteps: [],
        save: mockSave
      };
      mockedUserLearningPath.findOne.mockResolvedValue(mockProgress as any);
      mockedUserBadge.findOne.mockResolvedValue(null);
      mockedUser.findByIdAndUpdate.mockResolvedValue(true as any);
      mockedBadge.findById.mockResolvedValue({ name: "Awesome Badge" } as any);

      await completeStep(req as any, res as any, jest.fn());

      expect(mockProgress.completedSteps).toContain(0);
      expect(mockProgress.isCompleted).toBe(true);
      expect(mockSave).toHaveBeenCalled();
      expect(mockedUserBadge.create).toHaveBeenCalled();
      expect(createAndEmitNotification).toHaveBeenCalledWith(expect.objectContaining({ type: "badge" }));
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, isCorrect: true }));
    });

    it("returns incorrect answer error if quiz answer is wrong", async () => {
      const req = mockRequest("user-1", { stepIndex: 0, answerIndex: 1 }, { id: "path-1" });
      const res = mockResponse();

      mockedLearningPath.findById.mockResolvedValue({ 
        _id: "path-1", 
        steps: [{ type: "quiz", quiz: { correctAnswer: 2 } }] 
      } as any);
      mockedUserLearningPath.findOne.mockResolvedValue({
        isCompleted: false,
        completedSteps: []
      } as any);

      await completeStep(req as any, res as any, jest.fn());

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false, isCorrect: false }));
    });

    it("throws a 401 AppError if not authenticated", async () => {
      const req = mockRequest(undefined, { stepIndex: 0 }, { id: "path-1" });
      const res = mockResponse();

      await expect(completeStep(req as any, res as any, jest.fn())).rejects.toThrow(AppError);
    });
  });
});
