import { Request, Response } from "express";
import mongoose from "mongoose";
import {
  createBadge,
  getAllBadges,
  toggleBadgeVisibility,
} from "../badgeController";
import Badge from "../../models/Badge";
import UserBadge from "../../models/UserBadge";
import { AuthRequest } from "../../middleware/auth";

jest.mock("../../models/Badge");
jest.mock("../../models/UserBadge");
jest.mock("../../models/User");

const mockedBadge = Badge as unknown as jest.Mocked<typeof Badge>;
const mockedUserBadge = UserBadge as unknown as jest.Mocked<typeof UserBadge>;

const mockResponse = () => {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res as Response;
};

const mockRequest = (userId: string, body: any = {}, query: any = {}, params: any = {}): AuthRequest => ({
  user: { _id: userId },
  body,
  query,
  params,
}) as unknown as AuthRequest;

describe("Badge Controller", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getAllBadges", () => {
    it("rejects NoSQL injection attempts via object category payloads", async () => {
      const req = mockRequest("user-1", {}, { category: { $ne: null } });
      const res = mockResponse();

      await getAllBadges(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: "Invalid query parameter format" }));
      expect(mockedBadge.find).not.toHaveBeenCalled();
    });

    it("rejects NoSQL injection attempts via object isActive payloads", async () => {
      const req = mockRequest("user-1", {}, { isActive: { $ne: null } });
      const res = mockResponse();

      await getAllBadges(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: "Invalid query parameter format" }));
      expect(mockedBadge.find).not.toHaveBeenCalled();
    });

    it("applies legitimate string filters to Badge.find", async () => {
      const req = mockRequest("user-1", {}, { category: "clinical", isActive: "true" });
      const res = mockResponse();

      const sortMock = jest.fn().mockResolvedValue([{ _id: "badge-1" }]);
      mockedBadge.find.mockReturnValue({ sort: sortMock } as any);

      await getAllBadges(req as any, res as any);

      expect(mockedBadge.find).toHaveBeenCalledWith({ category: "clinical", isActive: true });
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, data: expect.anything() }));
    });
  });

  describe("createBadge", () => {
    it("creates and saves a new badge", async () => {
      const req = mockRequest("admin-1", {
        name: "Expert",
        description: "Expert level badge",
        icon: "star",
        category: "points",
        criteria: { type: "points", threshold: 100 },
        color: "#fff"
      });
      const res = mockResponse();

      const saveMock = jest.fn().mockResolvedValue(undefined);
      jest.spyOn(Badge.prototype, 'save').mockImplementation(saveMock);

      await createBadge(req as any, res as any);

      expect(saveMock).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));

      saveMock.mockRestore();
    });

    it("returns 400 with validation errors when body is empty", async () => {
      const req = mockRequest("admin-1", {});
      const res = mockResponse();

      const validationError = new mongoose.Error.ValidationError();
      validationError.errors = {
        name: new mongoose.Error.ValidatorError({ message: "Badge name is required", path: "name" }),
        description: new mongoose.Error.ValidatorError({ message: "Badge description is required", path: "description" }),
        icon: new mongoose.Error.ValidatorError({ message: "Badge icon is required", path: "icon" }),
        category: new mongoose.Error.ValidatorError({ message: "Badge category is required", path: "category" })
      };
      const saveMock = jest.fn().mockRejectedValue(validationError);
      jest.spyOn(Badge.prototype, 'save').mockImplementation(saveMock);

      await createBadge(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        message: "Validation error",
        errors: expect.arrayContaining([
          "Badge name is required",
          "Badge description is required"
        ])
      }));

      saveMock.mockRestore();
    });

    it("returns 400 with specific field error when one required field is missing", async () => {
      const req = mockRequest("admin-1", {
        name: "Expert",
        description: "Expert badge",
        icon: "star",
        category: "achievement",
        criteria: { type: "points", threshold: 100 }
      });
      const res = mockResponse();

      const validationError = new mongoose.Error.ValidationError();
      validationError.errors = {
        color: new mongoose.Error.ValidatorError({ message: "Badge color is required", path: "color" })
      };
      const saveMock = jest.fn().mockRejectedValue(validationError);
      jest.spyOn(Badge.prototype, 'save').mockImplementation(saveMock);

      await createBadge(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        message: "Validation error",
        errors: ["Badge color is required"]
      }));

      saveMock.mockRestore();
    });

    it("returns 500 for non-validation database errors", async () => {
      const req = mockRequest("admin-1", {
        name: "Expert",
        description: "Expert level badge",
        icon: "star",
        category: "points",
        criteria: { type: "points", threshold: 100 },
        color: "#fff"
      });
      const res = mockResponse();

      const dbError = new Error("Database connection lost");
      const saveMock = jest.fn().mockRejectedValue(dbError);
      jest.spyOn(Badge.prototype, 'save').mockImplementation(saveMock);

      await createBadge(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        message: "Internal server error"
      }));

      saveMock.mockRestore();
    });
  });

  describe("toggleBadgeVisibility", () => {
    it("updates visibility flag securely for matching user", async () => {
      const req = mockRequest("user-1", { isVisible: false }, {}, { userBadgeId: "ub-1" });
      const res = mockResponse();

      const populateMock = jest.fn().mockResolvedValue({ _id: "ub-1", isVisible: false });
      mockedUserBadge.findOneAndUpdate.mockReturnValue({ populate: populateMock } as any);

      await toggleBadgeVisibility(req as any, res as any);

      expect(mockedUserBadge.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: "ub-1", user: "user-1" },
        { isVisible: false },
        { new: true }
      );
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it("returns 404 if user badge not found or not owned by user", async () => {
      const req = mockRequest("user-1", { isVisible: false }, {}, { userBadgeId: "ub-1" });
      const res = mockResponse();

      const populateMock = jest.fn().mockResolvedValue(null);
      mockedUserBadge.findOneAndUpdate.mockReturnValue({ populate: populateMock } as any);

      await toggleBadgeVisibility(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: "Badge not found" }));
    });
  });
});
