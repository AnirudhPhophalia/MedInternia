import { Request, Response } from "express";
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
      // We mock the Badge constructor behavior by mocking the model's implementation
      // Actually, jest.mock automatically mocks constructor functions.
      // But we need to ensure `.save` exists on the returned instance.
      // Easiest way in Jest when a module exports a class model is to mock its prototype.
      jest.spyOn(Badge.prototype, 'save').mockImplementation(saveMock);

      await createBadge(req as any, res as any);

      expect(saveMock).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
      
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
