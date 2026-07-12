import { Response } from "express";
import {
  getResearchPaperById,
  createResearchPaper,
  getAllResearchPapers,
  updateResearchPaper,
  deleteResearchPaper
} from "../researchPaperController";
import ResearchPaper from "../../models/ResearchPaper";
import { AuthRequest } from "../../middleware/auth";

jest.mock("../../models/ResearchPaper");
const mockedResearchPaper = ResearchPaper as unknown as jest.Mocked<typeof ResearchPaper>;

const mockResponse = () => {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res as Response;
};

const mockRequest = (user: any = null, body: any = {}, params: any = {}, query: any = {}) => ({
  user,
  body,
  params,
  query,
} as any);

describe("Research Paper Controller", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getResearchPaperById", () => {
    it("returns 404 if not found", async () => {
      const req = mockRequest(null, {}, { id: "rp-1" });
      const res = mockResponse();

      mockedResearchPaper.findById.mockReturnValue({ populate: jest.fn().mockResolvedValue(null) } as any);

      await getResearchPaperById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Research paper not found.' });
    });

    it("returns paper if found", async () => {
      const req = mockRequest(null, {}, { id: "rp-1" });
      const res = mockResponse();

      const mockPaper = { _id: "rp-1", title: "Test" };
      mockedResearchPaper.findById.mockReturnValue({ populate: jest.fn().mockResolvedValue(mockPaper) } as any);

      await getResearchPaperById(req, res);

      expect(res.json).toHaveBeenCalledWith({ data: { paper: mockPaper } });
    });
  });

  describe("createResearchPaper", () => {
    it("returns 401 if unauthorized", async () => {
      const req = mockRequest(null, { title: "Test" });
      const res = mockResponse();

      await createResearchPaper(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it("creates paper successfully", async () => {
      const req = mockRequest({ _id: "user-1" }, { title: "Test", field: "AI", difficulty: "Hard" });
      const res = mockResponse();

      // mock save
      const mockSave = jest.fn().mockResolvedValue(true);
      (ResearchPaper as any).mockImplementation(() => ({
        save: mockSave,
        title: "Test",
        author: "user-1"
      }));

      await createResearchPaper(req, res);

      expect(mockSave).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
    });
  });

  describe("getAllResearchPapers", () => {
    it("fetches with filters and populates author", async () => {
      const req = mockRequest(null, {}, {}, { field: "AI", difficulty: "Hard" });
      const res = mockResponse();

      const sortMock = jest.fn().mockResolvedValue([{ _id: "rp-1" }]);
      const populateMock = jest.fn().mockReturnValue({ sort: sortMock });
      mockedResearchPaper.find.mockReturnValue({ populate: populateMock } as any);

      await getAllResearchPapers(req, res);

      expect(mockedResearchPaper.find).toHaveBeenCalledWith({ field: "AI", difficulty: "Hard" });
      expect(populateMock).toHaveBeenCalledWith("author", "firstName lastName");
      expect(sortMock).toHaveBeenCalledWith({ createdAt: -1 });
      expect(res.json).toHaveBeenCalledWith([{ _id: "rp-1" }]);
    });
  });

  describe("updateResearchPaper", () => {
    it("returns 404 if paper not found", async () => {
      const req = mockRequest({ _id: "user-1" }, {}, { id: "rp-1" });
      const res = mockResponse();

      mockedResearchPaper.findById.mockResolvedValue(null);

      await updateResearchPaper(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("returns 403 if user is not author and not admin", async () => {
      const req = mockRequest({ _id: "user-2", userType: "user" }, {}, { id: "rp-1" });
      const res = mockResponse();

      const mockPaper = { _id: "rp-1", author: { toString: () => "user-1" } };
      mockedResearchPaper.findById.mockResolvedValue(mockPaper as any);

      await updateResearchPaper(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it("updates if user is author", async () => {
      const req = mockRequest({ _id: "user-1", userType: "user" }, { title: "New Title" }, { id: "rp-1" });
      const res = mockResponse();

      const mockPaper = { _id: "rp-1", author: { toString: () => "user-1" }, title: "Old Title", save: jest.fn() };
      mockedResearchPaper.findById.mockResolvedValue(mockPaper as any);

      await updateResearchPaper(req, res);

      expect(mockPaper.title).toBe("New Title");
      expect(mockPaper.save).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(mockPaper);
    });

    it("updates if user is admin", async () => {
      const req = mockRequest({ _id: "admin-1", userType: "admin" }, { title: "New Title" }, { id: "rp-1" });
      const res = mockResponse();

      const mockPaper = { _id: "rp-1", author: { toString: () => "user-1" }, title: "Old Title", save: jest.fn() };
      mockedResearchPaper.findById.mockResolvedValue(mockPaper as any);

      await updateResearchPaper(req, res);

      expect(mockPaper.title).toBe("New Title");
      expect(mockPaper.save).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(mockPaper);
    });
  });

  describe("deleteResearchPaper", () => {
    it("returns 404 if paper not found", async () => {
      const req = mockRequest({ _id: "user-1" }, {}, { id: "rp-1" });
      const res = mockResponse();

      mockedResearchPaper.findById.mockResolvedValue(null);

      await deleteResearchPaper(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("returns 403 if user is not author and not admin", async () => {
      const req = mockRequest({ _id: "user-2", userType: "user" }, {}, { id: "rp-1" });
      const res = mockResponse();

      const mockPaper = { _id: "rp-1", author: { toString: () => "user-1" } };
      mockedResearchPaper.findById.mockResolvedValue(mockPaper as any);

      await deleteResearchPaper(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it("deletes if user is author", async () => {
      const req = mockRequest({ _id: "user-1", userType: "user" }, {}, { id: "rp-1" });
      const res = mockResponse();

      const mockPaper = { _id: "rp-1", author: { toString: () => "user-1" } };
      mockedResearchPaper.findById.mockResolvedValue(mockPaper as any);
      mockedResearchPaper.findByIdAndDelete.mockResolvedValue(true as any);

      await deleteResearchPaper(req, res);

      expect(mockedResearchPaper.findByIdAndDelete).toHaveBeenCalledWith("rp-1");
      expect(res.json).toHaveBeenCalledWith({ message: 'Research paper deleted successfully.' });
    });

    it("deletes if user is admin", async () => {
      const req = mockRequest({ _id: "admin-1", userType: "admin" }, {}, { id: "rp-1" });
      const res = mockResponse();

      const mockPaper = { _id: "rp-1", author: { toString: () => "user-1" } };
      mockedResearchPaper.findById.mockResolvedValue(mockPaper as any);
      mockedResearchPaper.findByIdAndDelete.mockResolvedValue(true as any);

      await deleteResearchPaper(req, res);

      expect(mockedResearchPaper.findByIdAndDelete).toHaveBeenCalledWith("rp-1");
      expect(res.json).toHaveBeenCalledWith({ message: 'Research paper deleted successfully.' });
    });
  });
});
