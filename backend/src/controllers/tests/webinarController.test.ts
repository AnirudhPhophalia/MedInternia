import { Request, Response } from "express";
import {
  registerForWebinar,
  unregisterFromWebinar,
  getWebinars,
} from "../webinarController";
import Webinar from "../../models/Webinar";
import { AuthRequest } from "../../middleware/auth";

jest.mock("../../models/Webinar");
jest.mock("../../utils/socket", () => {
  const original = jest.requireActual("../../utils/socket");
  return {
    ...original,
    getSocketIO: jest.fn(),
  };
});
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

  describe("getWebinars", () => {
    it("does not leak participants or meetingLink in the public list", async () => {
      const webinarRow = {
        _id: "webinar-1",
        title: "Cardiology Live",
        description: "desc",
        host: { _id: "host-1", firstName: "Alice" },
        type: "webinar",
        specialization: ["cardiology"],
        scheduledAt: new Date(Date.now() + 100000),
        duration: 60,
        maxParticipants: 100,
        tags: [],
        materials: [],
        isActive: true,
        isRecorded: false,
        status: "scheduled",
        createdAt: new Date(),
        updatedAt: new Date(),
        participants: [{ user: { _id: "participant-1", firstName: "Eve" } }],
        meetingLink: "https://meet.jit.si/webinar-123",
        polls: [],
        qna: [],
      };
      mockedWebinar.find.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        select: jest.fn().mockResolvedValue([]),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([webinarRow]),
      } as any);
      mockedWebinar.countDocuments.mockResolvedValue(1);

      const req = { query: {} } as Request;
      const res = mockResponse();

      await getWebinars(req, res);

      const payload = (res.json as jest.Mock).mock.calls[0][0];
      const webinar = payload.data.webinars[0];
      expect(webinar).not.toHaveProperty("meetingLink");
      expect(webinar).not.toHaveProperty("participants");
      expect(webinar).not.toHaveProperty("polls");
      expect(webinar).not.toHaveProperty("qna");
      expect(webinar.participantCount).toBe(1);
      expect(payload.data.total).toBe(1);
    });

    it("exposes only public metadata fields for each webinar", async () => {
      const webinarRow = {
        _id: "webinar-1",
        title: "AMA Session",
        description: "desc",
        host: { _id: "host-1", firstName: "Bob" },
        type: "ama",
        specialization: ["general"],
        scheduledAt: new Date(),
        duration: 45,
        maxParticipants: 50,
        tags: [],
        materials: [],
        isActive: true,
        isRecorded: false,
        status: "scheduled",
        createdAt: new Date(),
        updatedAt: new Date(),
        participants: [],
        meetingLink: "https://meet.jit.si/secret",
      };
      mockedWebinar.find.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        select: jest.fn().mockResolvedValue([]),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([webinarRow]),
      } as any);
      mockedWebinar.countDocuments.mockResolvedValue(1);

      const req = { query: {} } as Request;
      const res = mockResponse();

      await getWebinars(req, res);

      const webinar = (res.json as jest.Mock).mock.calls[0][0].data.webinars[0];
      expect(webinar.title).toBe("AMA Session");
      expect(webinar.description).toBe("desc");
      expect(webinar.scheduledAt).toBe(webinarRow.scheduledAt);
      expect(webinar.maxParticipants).toBe(50);
      expect(webinar.host).toEqual(webinarRow.host);
    });
  });

  describe("Polling socket emits", () => {
    it("emits sanitized webinar update without raw votes map over socket on votePoll", async () => {
      const { votePoll } = require("../webinarController");
      const { getSocketIO } = require("../../utils/socket");
      
      const mockEmit = jest.fn();
      const mockTo = jest.fn().mockReturnValue({ emit: mockEmit });
      (getSocketIO as jest.Mock).mockReturnValue({ to: mockTo });

      const votesMap = new Map();
      votesMap.set("user-1", 0);

      const webinarMock = {
        _id: "webinar-1",
        status: "live",
        scheduledAt: new Date(Date.now() - 10000),
        duration: 60,
        host: "host-1",
        participants: [{ user: "user-1" }],
        meetingLink: "https://secret.meet/link",
        polls: [
          {
            _id: "poll-1",
            question: "Sample Question?",
            options: ["Option 1", "Option 2"],
            active: true,
            votes: votesMap,
          },
        ],
        save: jest.fn().mockResolvedValue(undefined),
      };

      mockedWebinar.findById.mockResolvedValue(webinarMock as any);

      const req = {
        user: { _id: "user-1", userType: "doctor" },
        params: { id: "webinar-1", pollId: "poll-1" },
        body: { optionIndex: 1 },
      } as unknown as AuthRequest;
      const res = mockResponse();

      await votePoll(req, res);

      expect(mockTo).toHaveBeenCalledWith("webinar:webinar-1");
      expect(mockEmit).toHaveBeenCalledWith("webinar_update", expect.any(Object));

      const emittedPayload = mockEmit.mock.calls[0][1];
      expect(emittedPayload).not.toHaveProperty("meetingLink");
      expect(emittedPayload).not.toHaveProperty("participants");
      expect(emittedPayload.polls[0]).not.toHaveProperty("votes");
      expect(emittedPayload.polls[0].voteCounts).toEqual([0, 1]);
      expect(emittedPayload.polls[0].totalVotes).toBe(1);
    });
  });
});
