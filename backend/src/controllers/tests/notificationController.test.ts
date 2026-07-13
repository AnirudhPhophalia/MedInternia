import { Response } from "express";
import { markRead, markAllRead, getNotifications } from "../notificationController";
import Notification from "../../models/Notification";
import { AuthRequest } from "../../middleware/auth";

jest.mock("../../models/Notification");

const mockedNotification = Notification as unknown as jest.Mocked<typeof Notification>;

const mockResponse = () => {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res as Response;
};

const mockRequest = (userId: string, params: any = {}): AuthRequest => ({
  user: { _id: userId },
  params,
}) as unknown as AuthRequest;

describe("Notification Controller", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getNotifications", () => {
    it("fetches notifications scoped to the logged-in user", async () => {
      const req = mockRequest("user-1");
      const res = mockResponse();

      const limitMock = jest.fn().mockResolvedValue([{ _id: "notif-1" }]);
      const sortMock = jest.fn().mockReturnValue({ limit: limitMock });
      mockedNotification.find.mockReturnValue({ sort: sortMock } as any);

      await getNotifications(req as any, res as any);

      expect(mockedNotification.find).toHaveBeenCalledWith({ recipient: "user-1" });
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, notifications: expect.any(Array) }));
    });
    
    it("returns 401 if user is not authenticated", async () => {
      const req = { params: {} } as unknown as AuthRequest;
      const res = mockResponse();

      await getNotifications(req, res as any);

      expect(res.status).toHaveBeenCalledWith(401);
    });
  });

  describe("markRead", () => {
    it("scopes update to the notification ID and the logged-in user's ID", async () => {
      const req = mockRequest("user-1", { id: "notif-1" });
      const res = mockResponse();

      mockedNotification.updateOne.mockResolvedValue({ modifiedCount: 1 } as any);

      await markRead(req as any, res as any);

      // This assertion locks in the regression test: another user's notification cannot be marked read cross-account
      expect(mockedNotification.updateOne).toHaveBeenCalledWith(
        { _id: "notif-1", recipient: "user-1" },
        { isRead: true }
      );
      expect(res.json).toHaveBeenCalledWith({ success: true });
    });

    it("returns 401 if user is not authenticated", async () => {
      const req = { params: { id: "notif-1" } } as unknown as AuthRequest;
      const res = mockResponse();

      await markRead(req, res as any);

      expect(res.status).toHaveBeenCalledWith(401);
    });
  });

  describe("markAllRead", () => {
    it("updates only unread notifications belonging to the requester", async () => {
      const req = mockRequest("user-1");
      const res = mockResponse();

      mockedNotification.updateMany.mockResolvedValue({ modifiedCount: 5 } as any);

      await markAllRead(req as any, res as any);

      expect(mockedNotification.updateMany).toHaveBeenCalledWith(
        { recipient: "user-1", isRead: false },
        { isRead: true }
      );
      expect(res.json).toHaveBeenCalledWith({ success: true });
    });

    it("returns 401 if user is not authenticated", async () => {
      const req = { params: {} } as unknown as AuthRequest;
      const res = mockResponse();

      await markAllRead(req, res as any);

      expect(res.status).toHaveBeenCalledWith(401);
    });
  });
});
