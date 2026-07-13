import { Response } from "express";
import { requestMentorship, updateMentorshipStatus } from "../mentorshipController";
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
  beforeEach(() => {
    jest.clearAllMocks();
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
    it("allows mentor to accept or reject a request", async () => {
      const req = mockRequest("doctor-1", "doctor", { status: "accepted" }, { id: "req-1" });
      const res = mockResponse();

      const mockSave = jest.fn();
      mockedMentorship.findById.mockResolvedValue({ 
        _id: "req-1", 
        mentor: { toString: () => "doctor-1" }, 
        status: "pending", 
        save: mockSave 
      } as any);

      await updateMentorshipStatus(req as any, res as any);

      expect(mockedMentorship.findById).toHaveBeenCalledWith("req-1");
      expect(mockSave).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it("returns 403 if someone other than the mentor tries to accept/reject", async () => {
      const req = mockRequest("intern-1", "intern", { status: "accepted" }, { id: "req-1" });
      const res = mockResponse();

      mockedMentorship.findById.mockResolvedValue({ 
        _id: "req-1", 
        mentor: { toString: () => "doctor-1" }, 
        status: "pending" 
      } as any);

      await updateMentorshipStatus(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false, message: 'Only the mentor can update this status' }));
    });

    it("returns 404 if mentorship is not found", async () => {
      const req = mockRequest("doctor-1", "doctor", { status: "accepted" }, { id: "non-existent" });
      const res = mockResponse();

      mockedMentorship.findById.mockResolvedValue(null);

      await updateMentorshipStatus(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false, message: 'Mentorship not found' }));
    });
  });
});
