import { Response } from "express";
import mongoose from "mongoose";
import {
  requestMentorship,
  updateMentorshipStatus,
  getMentorshipById,
  addGoal,
  toggleGoal,
  addMeeting,
  completeMeeting
} from "../mentorshipController";
import Mentorship from "../../models/Mentorship";
import User from "../../models/User";

jest.mock("../../models/Mentorship");
jest.mock("../../models/User");

const mockedMentorship = Mentorship as unknown as jest.Mocked<typeof Mentorship>;
const mockedUser = User as unknown as jest.Mocked<typeof User>;

const mockResponse = () => {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res as Response;
};

const mockRequest = (userId: string, userType: string, body: any = {}, params: any = {}) => ({
  user: { id: userId, userType },
  body,
  params,
});

describe("Mentorship Controller", () => {
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

  describe("requestMentorship", () => {
    it("creates a mentorship request successfully", async () => {
      const req = mockRequest("intern-1", "intern", { mentorId: "doctor-1", specialtyRequested: "Cardiology", initialMessage: "Hi" });
      const res = mockResponse();

      mockedUser.findById.mockResolvedValue({ _id: "doctor-1", userType: "doctor" } as any);
      mockedMentorship.findOne.mockResolvedValue(null);
      mockedMentorship.create.mockResolvedValue({ _id: "mentor-req-1", mentor: "doctor-1", mentee: "intern-1" } as any);

      await requestMentorship(req as any, res as any);

      expect(mockedUser.findById).toHaveBeenCalledWith("doctor-1");
      expect(mockedMentorship.findOne).toHaveBeenCalledWith({
        mentor: "doctor-1",
        mentee: "intern-1",
        status: { $in: ['pending', 'active'] }
      });
      expect(mockedMentorship.create).toHaveBeenCalledWith({
        mentor: "doctor-1",
        mentee: "intern-1",
        specialtyRequested: "Cardiology",
        initialMessage: "Hi"
      });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it("returns 404 if mentor is not found or not a doctor", async () => {
      const req = mockRequest("intern-1", "intern", { mentorId: "not-a-doctor" });
      const res = mockResponse();

      mockedUser.findById.mockResolvedValue({ _id: "not-a-doctor", userType: "intern" } as any);

      await requestMentorship(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false, message: 'Mentor not found or is not a doctor' }));
    });

    it("returns 400 if duplicate active or pending request exists", async () => {
      const req = mockRequest("intern-1", "intern", { mentorId: "doctor-1" });
      const res = mockResponse();

      mockedUser.findById.mockResolvedValue({ _id: "doctor-1", userType: "doctor" } as any);
      mockedMentorship.findOne.mockResolvedValue({ _id: "existing-req" } as any);

      await requestMentorship(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false, message: 'You already have an active or pending mentorship with this doctor' }));
    });
  });

  describe("updateMentorshipStatus", () => {
    it("allows mentor to accept a pending request", async () => {
      const req = mockRequest("doctor-1", "doctor", { status: "active" }, { id: "req-1" });
      const res = mockResponse();

      const mockSave = jest.fn();
      mockedMentorship.findById.mockResolvedValue({ 
        _id: "req-1", 
        mentor: { toString: () => "doctor-1" },
        mentee: { toString: () => "intern-1" },
        status: "pending", 
        save: mockSave 
      } as any);

      await updateMentorshipStatus(req as any, res as any);

      expect(mockedMentorship.findById).toHaveBeenCalledWith("req-1");
      expect(mockSave).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it("returns 403 if mentee tries to complete a pending request", async () => {
      const req = mockRequest("intern-1", "intern", { status: "completed" }, { id: "req-1" });
      const res = mockResponse();

      mockedMentorship.findById.mockResolvedValue({
        _id: "req-1",
        mentor: { toString: () => "doctor-1" },
        mentee: { toString: () => "intern-1" },
        status: "pending"
      } as any);

      await updateMentorshipStatus(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        message: 'Mentees can only mark an active mentorship as completed'
      }));
    });

    it("returns 404 if mentorship is not found", async () => {
      const req = mockRequest("doctor-1", "doctor", { status: "active" }, { id: "non-existent" });
      const res = mockResponse();

      mockedMentorship.findById.mockResolvedValue(null);

      await updateMentorshipStatus(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false, message: 'Mentorship not found' }));
    });

    it("sets mentorDoctor on the mentee when status is active", async () => {
      const mentorId = "doctor-1";
      const menteeId = "intern-1";
      const req = mockRequest(mentorId, "doctor", { status: "active" }, { id: "req-1" });
      const res = mockResponse();

      const mockSave = jest.fn();
      mockedMentorship.findById.mockResolvedValue({
        _id: "req-1",
        mentor: { toString: () => mentorId },
        mentee: menteeId,
        status: "pending",
        save: mockSave,
      } as any);

      await updateMentorshipStatus(req as any, res as any);

      expect(mockSave).toHaveBeenCalledWith({ session: mockSession });
      expect(mockedUser.findByIdAndUpdate).toHaveBeenCalledWith(menteeId, {
        mentorDoctor: expect.objectContaining({ toString: expect.any(Function) })
      }, { session: mockSession });
      expect(mockSession.commitTransaction).toHaveBeenCalled();
      expect(mockSession.endSession).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it("clears mentorDoctor when mentorship is rejected", async () => {
      const mentorId = "doctor-1";
      const menteeId = "intern-1";
      const req = mockRequest(mentorId, "doctor", { status: "rejected" }, { id: "req-1" });
      const res = mockResponse();

      const mockSave = jest.fn();
      mockedMentorship.findById.mockResolvedValue({
        _id: "req-1",
        mentor: { toString: () => mentorId },
        mentee: menteeId,
        status: "pending",
        save: mockSave,
      } as any);

      await updateMentorshipStatus(req as any, res as any);

      expect(mockedUser.findByIdAndUpdate).toHaveBeenCalledWith(menteeId, {
        $unset: { mentorDoctor: 1 }
      }, { session: mockSession });
      expect(mockSession.commitTransaction).toHaveBeenCalled();
      expect(mockSession.endSession).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe("getMentorshipById", () => {
    it("returns 200 and mentorship document if found and authorized", async () => {
      const req = mockRequest("doctor-1", "doctor", {}, { id: "mentorship-1" });
      const res = mockResponse();

      const populate2 = jest.fn().mockResolvedValue({
        _id: "mentorship-1",
        mentor: { _id: "doctor-1" },
        mentee: { _id: "intern-1" },
      });
      const populate1 = jest.fn().mockReturnValue({ populate: populate2 });
      mockedMentorship.findById.mockReturnValue({ populate: populate1 } as any);

      await getMentorshipById(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it("returns 404 if mentorship not found", async () => {
      const req = mockRequest("doctor-1", "doctor", {}, { id: "non-existent" });
      const res = mockResponse();

      const populate2 = jest.fn().mockResolvedValue(null);
      const populate1 = jest.fn().mockReturnValue({ populate: populate2 });
      mockedMentorship.findById.mockReturnValue({ populate: populate1 } as any);

      await getMentorshipById(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false, message: 'Mentorship not found' }));
    });
  });

  describe("addGoal", () => {
    it("adds goal successfully if mentorship exists", async () => {
      const req = mockRequest("intern-1", "intern", { title: "Study ECG", description: "Learn 12-lead ECG" }, { id: "mentorship-1" });
      const res = mockResponse();

      mockedMentorship.findById.mockResolvedValue({
        _id: "mentorship-1",
        mentee: { toString: () => "intern-1" },
        goals: [],
      } as any);
      mockedMentorship.findByIdAndUpdate.mockResolvedValue({
        _id: "mentorship-1",
        goals: [{ title: "Study ECG", description: "Learn 12-lead ECG", isCompleted: false }],
      } as any);

      await addGoal(req as any, res as any);

      expect(mockedMentorship.findByIdAndUpdate).toHaveBeenCalledWith(
        "mentorship-1",
        expect.objectContaining({
          $push: expect.objectContaining({
            goals: expect.objectContaining({ title: "Study ECG", isCompleted: false }),
          }),
        }),
        { new: true }
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it("returns 404 if mentorship is not found", async () => {
      const req = mockRequest("intern-1", "intern", { title: "Study ECG" }, { id: "non-existent" });
      const res = mockResponse();

      mockedMentorship.findById.mockResolvedValue(null);

      await addGoal(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false, message: 'Mentorship not found' }));
    });
  });

  describe("toggleGoal", () => {
    it("toggles goal completion successfully if mentorship and goal exist", async () => {
      const req = mockRequest("intern-1", "intern", {}, { id: "mentorship-1", goalId: "goal-1" });
      const res = mockResponse();

      const mockSave = jest.fn();
      const mockGoal = { _id: "goal-1", isCompleted: false };
      mockedMentorship.findById.mockResolvedValue({
        _id: "mentorship-1",
        mentee: { toString: () => "intern-1" },
        goals: [mockGoal],
        save: mockSave,
      } as any);

      await toggleGoal(req as any, res as any);

      expect(mockGoal.isCompleted).toBe(true);
      expect(mockSave).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it("returns 404 if mentorship is not found", async () => {
      const req = mockRequest("intern-1", "intern", {}, { id: "non-existent", goalId: "goal-1" });
      const res = mockResponse();

      mockedMentorship.findById.mockResolvedValue(null);

      await toggleGoal(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false, message: 'Mentorship not found' }));
    });
  });

  describe("addMeeting", () => {
    const FUTURE = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const PAST = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    it("adds meeting successfully if mentorship exists", async () => {
      const req = mockRequest("doctor-1", "doctor", { scheduledAt: FUTURE, topic: "Clinical audit", link: "zoom.us", notes: "preparation" }, { id: "mentorship-1" });
      const res = mockResponse();

      mockedMentorship.findById.mockResolvedValue({
        _id: "mentorship-1",
        mentor: { toString: () => "doctor-1" },
        meetings: [],
      } as any);
      mockedMentorship.findByIdAndUpdate.mockResolvedValue({
        _id: "mentorship-1",
        meetings: [{ scheduledAt: new Date("2026-07-13T22:00:00Z"), topic: "Clinical audit", link: "zoom.us", notes: "preparation" }],
      } as any);

      await addMeeting(req as any, res as any);

      expect(mockedMentorship.findByIdAndUpdate).toHaveBeenCalledWith(
        "mentorship-1",
        expect.objectContaining({
          $push: expect.objectContaining({
            meetings: expect.objectContaining({ topic: "Clinical audit", link: "zoom.us" }),
          }),
        }),
        { new: true }
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it("returns 404 if mentorship is not found", async () => {
      const req = mockRequest("doctor-1", "doctor", { scheduledAt: "2026-07-13T22:00:00Z" }, { id: "non-existent" });
      const res = mockResponse();

      mockedMentorship.findById.mockResolvedValue(null);

      await addMeeting(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false, message: 'Mentorship not found' }));
    });

    it("rejects a meeting scheduled in the past (400)", async () => {
      const req = mockRequest("doctor-1", "doctor", { scheduledAt: PAST, topic: "Late" }, { id: "mentorship-1" });
      const res = mockResponse();
      mockedMentorship.findById.mockResolvedValue({
        _id: "mentorship-1",
        mentor: { toString: () => "doctor-1" },
        meetings: [],
      } as any);

      await addMeeting(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(mockedMentorship.findByIdAndUpdate).not.toHaveBeenCalled();
    });

    it("rejects a meeting that overlaps an existing one (409)", async () => {
      const req = mockRequest("doctor-1", "doctor", { scheduledAt: FUTURE, topic: "Clash" }, { id: "mentorship-1" });
      const res = mockResponse();
      // An existing scheduled meeting 10 minutes from the requested time.
      const near = new Date(new Date(FUTURE).getTime() + 10 * 60 * 1000);
      mockedMentorship.findById.mockResolvedValue({
        _id: "mentorship-1",
        mentor: { toString: () => "doctor-1" },
        meetings: [{ scheduledAt: near, status: "scheduled" }],
      } as any);

      await addMeeting(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(mockedMentorship.findByIdAndUpdate).not.toHaveBeenCalled();
    });
  });

  describe("completeMeeting", () => {
    const PAST = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const FUTURE = new Date(Date.now() + 24 * 60 * 60 * 1000);

    it("marks a past scheduled meeting as completed and saves", async () => {
      const meeting: any = { _id: { toString: () => "m1" }, scheduledAt: PAST, status: "scheduled" };
      const mockSave = jest.fn();
      mockedMentorship.findById.mockResolvedValue({
        mentor: { toString: () => "doctor-1" },
        mentee: { toString: () => "intern-1" },
        meetings: [meeting],
        save: mockSave,
      } as any);
      const req = mockRequest("doctor-1", "doctor", {}, { id: "mentorship-1", meetingId: "m1" });
      const res = mockResponse();

      await completeMeeting(req as any, res as any);

      expect(meeting.status).toBe("completed");
      expect(meeting.completedAt).toBeInstanceOf(Date);
      expect(mockSave).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("refuses to complete a meeting that hasn't happened yet (400)", async () => {
      const meeting: any = { _id: { toString: () => "m1" }, scheduledAt: FUTURE, status: "scheduled" };
      const mockSave = jest.fn();
      mockedMentorship.findById.mockResolvedValue({
        mentor: { toString: () => "doctor-1" },
        mentee: { toString: () => "intern-1" },
        meetings: [meeting],
        save: mockSave,
      } as any);
      const req = mockRequest("doctor-1", "doctor", {}, { id: "mentorship-1", meetingId: "m1" });
      const res = mockResponse();

      await completeMeeting(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(mockSave).not.toHaveBeenCalled();
    });

    it("is idempotent when the meeting is already completed (200, no re-save)", async () => {
      const meeting: any = { _id: { toString: () => "m1" }, scheduledAt: PAST, status: "completed" };
      const mockSave = jest.fn();
      mockedMentorship.findById.mockResolvedValue({
        mentor: { toString: () => "doctor-1" },
        mentee: { toString: () => "intern-1" },
        meetings: [meeting],
        save: mockSave,
      } as any);
      const req = mockRequest("intern-1", "intern", {}, { id: "mentorship-1", meetingId: "m1" });
      const res = mockResponse();

      await completeMeeting(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(mockSave).not.toHaveBeenCalled();
    });

    it("rejects a non-participant (403)", async () => {
      mockedMentorship.findById.mockResolvedValue({
        mentor: { toString: () => "doctor-1" },
        mentee: { toString: () => "intern-1" },
        meetings: [{ _id: { toString: () => "m1" }, scheduledAt: PAST, status: "scheduled" }],
        save: jest.fn(),
      } as any);
      const req = mockRequest("stranger-9", "doctor", {}, { id: "mentorship-1", meetingId: "m1" });
      const res = mockResponse();

      await completeMeeting(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  describe("updateMentorshipStatus — mentoring credits", () => {
    it("awards mentoring credits to the mentor when a mentorship is completed", async () => {
      const req = mockRequest("intern-1", "intern", { status: "completed" }, { id: "req-1" });
      const res = mockResponse();
      mockedMentorship.findById.mockResolvedValue({
        _id: "req-1",
        mentor: { toString: () => "doctor-1" },
        mentee: { toString: () => "intern-1" },
        status: "active",
        save: jest.fn(),
      } as any);
      (mockedUser.findByIdAndUpdate as jest.Mock).mockResolvedValue({} as any);

      await updateMentorshipStatus(req as any, res as any);

      // Mentor receives a positive mentoringCredits increment inside the txn.
      expect(mockedUser.findByIdAndUpdate).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ $inc: expect.objectContaining({ mentoringCredits: expect.any(Number) }) }),
        expect.objectContaining({ session: mockSession })
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });
});
