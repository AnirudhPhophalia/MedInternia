import { Request, Response } from "express";
import {
  registerForWebinar,
  unregisterFromWebinar,
} from "../webinarController";
import Webinar from "../../models/Webinar";
import { AuthRequest } from "../../middleware/auth";

jest.mock("../../models/Webinar");
const mockedWebinar = Webinar as unknown as jest.Mocked<typeof Webinar>;

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

describe("Webinar Controller", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedWebinar.updateMany.mockResolvedValue({} as any);
    mockedWebinar.find.mockReturnValue({
      select: jest.fn().mockResolvedValue([]),
    } as any);
  });

  describe("registerForWebinar", () => {
    it("rejects registration if webinar is full", async () => {
      const webinarMock = {
        _id: "webinar-1",
        status: "scheduled",
        scheduledAt: new Date(Date.now() + 100000),
        maxParticipants: 2,
        participants: [{ user: "user-1" }, { user: "user-2" }],
      };
      mockedWebinar.findById.mockResolvedValue(webinarMock as any);

      const req = mockRequest("user-3", { id: "webinar-1" });
      const res = mockResponse();

      await registerForWebinar(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: "Webinar is full" }));
    });

    it("rejects duplicate registration", async () => {
      const webinarMock = {
        _id: "webinar-1",
        status: "scheduled",
        scheduledAt: new Date(Date.now() + 100000),
        maxParticipants: 5,
        participants: [{ user: "user-1" }],
      };
      mockedWebinar.findById.mockResolvedValue(webinarMock as any);

      const req = mockRequest("user-1", { id: "webinar-1" });
      const res = mockResponse();

      await registerForWebinar(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: "You are already registered for this webinar" }));
    });

    it("rejects registration if registrationDeadline has passed", async () => {
      const pastDeadline = new Date(Date.now() - 100000); // Past deadline
      const webinarMock = {
        _id: "webinar-1",
        status: "scheduled",
        scheduledAt: new Date(Date.now() + 100000), // But webinar hasn't happened yet
        registrationDeadline: pastDeadline,
        maxParticipants: 5,
        participants: [],
      };
      mockedWebinar.findById.mockResolvedValue(webinarMock as any);

      const req = mockRequest("user-1", { id: "webinar-1" });
      const res = mockResponse();

      await registerForWebinar(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: "Registration deadline has passed" }));
    });

    it("successfully registers user", async () => {
      const webinarMock = {
        _id: "webinar-1",
        status: "scheduled",
        scheduledAt: new Date(Date.now() + 100000),
        maxParticipants: 5,
        participants: [],
        save: jest.fn().mockResolvedValue(undefined),
      };
      mockedWebinar.findById.mockResolvedValue(webinarMock as any);

      const req = mockRequest("user-1", { id: "webinar-1" });
      const res = mockResponse();

      await registerForWebinar(req as any, res as any);

      expect(webinarMock.participants).toHaveLength(1);
      expect((webinarMock.participants as any[])[0].user).toBe("user-1");
      expect(webinarMock.save).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });
  });

  describe("unregisterFromWebinar", () => {
    it("rejects unregistration if webinar has already started (status: live)", async () => {
      const webinarMock = {
        _id: "webinar-1",
        status: "live",
        scheduledAt: new Date(Date.now() - 100000), // Past
        participants: [{ user: "user-1" }],
      };
      mockedWebinar.findById.mockResolvedValue(webinarMock as any);

      const req = mockRequest("user-1", { id: "webinar-1" });
      const res = mockResponse();

      await unregisterFromWebinar(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining("Cannot unregister") }));
    });

    it("rejects unregistration if webinar is scheduledAt past current time", async () => {
      const webinarMock = {
        _id: "webinar-1",
        status: "scheduled", // Technically scheduled, but time passed
        scheduledAt: new Date(Date.now() - 100000),
        participants: [{ user: "user-1" }],
      };
      mockedWebinar.findById.mockResolvedValue(webinarMock as any);

      const req = mockRequest("user-1", { id: "webinar-1" });
      const res = mockResponse();

      await unregisterFromWebinar(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining("Cannot unregister") }));
    });

    it("successfully unregisters user", async () => {
      const webinarMock = {
        _id: "webinar-1",
        status: "scheduled",
        scheduledAt: new Date(Date.now() + 100000),
        participants: [{ user: "user-1" }, { user: "user-2" }],
        save: jest.fn().mockResolvedValue(undefined),
      };
      mockedWebinar.findById.mockResolvedValue(webinarMock as any);

      const req = mockRequest("user-1", { id: "webinar-1" });
      const res = mockResponse();

      await unregisterFromWebinar(req as any, res as any);

      expect(webinarMock.participants).toHaveLength(1);
      expect(webinarMock.participants[0].user).toBe("user-2");
      expect(webinarMock.save).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });
  });
});
