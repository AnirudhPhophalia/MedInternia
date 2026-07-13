import { Response } from "express";
import { getDiaries, createDiary, addDiaryEntry } from "../diaryController";
import Diary from "../../models/Diary";
import { AuthRequest } from "../../middleware/auth";

jest.mock("../../models/Diary");

const mockedDiary = Diary as unknown as jest.Mocked<typeof Diary>;

const mockResponse = () => {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res as Response;
};

const mockRequest = (userId: string, body: any = {}, params: any = {}): AuthRequest => ({
  user: { _id: userId },
  body,
  params,
}) as unknown as AuthRequest;

describe("Diary Controller", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getDiaries", () => {
    it("fetches diaries scoped to the logged-in user", async () => {
      const req = mockRequest("user-1");
      const res = mockResponse();

      const sortMock = jest.fn().mockResolvedValue([{ _id: "diary-1" }]);
      mockedDiary.find.mockReturnValue({ sort: sortMock } as any);

      await getDiaries(req as any, res as any);

      expect(mockedDiary.find).toHaveBeenCalledWith({ user: "user-1" });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.any(Array));
    });

    it("returns 401 if unauthenticated", async () => {
      const req = { body: {} } as unknown as AuthRequest;
      const res = mockResponse();

      await getDiaries(req, res as any);
      expect(res.status).toHaveBeenCalledWith(401);
    });
  });

  describe("createDiary", () => {
    it("creates a diary with a title", async () => {
      const req = mockRequest("user-1", { title: "My Internship Journey" });
      const res = mockResponse();

      mockedDiary.create.mockResolvedValue({ _id: "diary-1", title: "My Internship Journey" } as any);

      await createDiary(req as any, res as any);

      expect(mockedDiary.create).toHaveBeenCalledWith({
        title: "My Internship Journey",
        user: "user-1",
        entries: [],
      });
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it("returns 400 if title is missing", async () => {
      const req = mockRequest("user-1", { title: "  " });
      const res = mockResponse();

      await createDiary(req as any, res as any);
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe("addDiaryEntry", () => {
    it("scopes diary lookup to the logged-in user and adds the entry", async () => {
      const req = mockRequest("user-1", { day: "Day 1", content: "Great day!" }, { diaryId: "diary-1" });
      const res = mockResponse();

      const saveMock = jest.fn().mockResolvedValue(true);
      mockedDiary.findOne.mockResolvedValue({ entries: [], save: saveMock } as any);

      await addDiaryEntry(req as any, res as any);

      expect(mockedDiary.findOne).toHaveBeenCalledWith({ _id: "diary-1", user: "user-1" });
      expect(saveMock).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("returns 404 if diary is not found or does not belong to the user", async () => {
      const req = mockRequest("user-1", { day: "Day 1", content: "Great day!" }, { diaryId: "diary-1" });
      const res = mockResponse();

      mockedDiary.findOne.mockResolvedValue(null);

      await addDiaryEntry(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });
});
