import { Response } from "express";
import { rateComment, advancedSearch } from "../enhancedController";
import Case from "../../models/Case";
import User from "../../models/User";
import Rating from "../../models/Rating";
import { AuthRequest } from "../../middleware/auth";

jest.mock("../../models/Case");
jest.mock("../../models/User");
jest.mock("../../models/Rating");

const mockedCase = Case as unknown as jest.Mocked<typeof Case>;
const mockedUser = User as unknown as jest.Mocked<typeof User>;
const mockedRating = Rating as unknown as jest.Mocked<typeof Rating>;

const mockResponse = () => {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res as Response;
};

const mockRequest = (userId: string, userType: string, body: any = {}, params: any = {}, query: any = {}): AuthRequest => ({
  user: { _id: userId, userType },
  body,
  params,
  query,
}) as unknown as AuthRequest;

describe("Enhanced Controller", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("rateComment", () => {
    it("rejects non-doctor/admin ratings", async () => {
      const req = mockRequest("intern-1", "intern", { rating: 5 });
      const res = mockResponse();

      await rateComment(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: "Only doctors or admins can rate comments" }));
    });

    it("rejects invalid rating range", async () => {
      const req = mockRequest("doc-1", "doctor", { rating: 6 });
      const res = mockResponse();

      await rateComment(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: "Rating must be between 1 and 5" }));
    });
    
    it("rejects rating another doctor's comment", async () => {
      const req = mockRequest("doc-1", "doctor", { rating: 4 }, { caseId: "case-1", commentId: "com-1" });
      const res = mockResponse();

      mockedCase.findById.mockResolvedValue({ comments: [{ _id: "com-1", author: "doc-2" }] } as any);
      mockedUser.findById.mockResolvedValue({ userType: "doctor" } as any); // Author is a doctor

      await rateComment(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: "Can only rate intern comments" }));
    });
  });

  describe("advancedSearch", () => {
    it("queries Case model when type is cases", async () => {
      const req = mockRequest("user-1", "intern", {}, {}, { type: "cases", query: "fever" });
      const res = mockResponse();

      const limitMock = jest.fn().mockResolvedValue([{ _id: "case-1" }]);
      const skipMock = jest.fn().mockReturnValue({ limit: limitMock });
      const sortMock = jest.fn().mockReturnValue({ skip: skipMock });
      const populateMock = jest.fn().mockReturnValue({ sort: sortMock });
      mockedCase.find.mockReturnValue({ populate: populateMock } as any);
      mockedCase.countDocuments.mockResolvedValue(1);

      await advancedSearch(req as any, res as any);

      expect(mockedCase.find).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ searchType: "cases" }),
        })
      );
    });

    it("queries User model when type is doctors", async () => {
      const req = mockRequest("user-1", "intern", {}, {}, { type: "doctors", query: "john" });
      const res = mockResponse();

      const limitMock = jest.fn().mockResolvedValue([{ _id: "doc-1" }]);
      const skipMock = jest.fn().mockReturnValue({ limit: limitMock });
      const sortMock = jest.fn().mockReturnValue({ skip: skipMock });
      const selectMock = jest.fn().mockReturnValue({ sort: sortMock });
      mockedUser.find.mockReturnValue({ select: selectMock } as any);
      mockedUser.countDocuments.mockResolvedValue(1);

      await advancedSearch(req as any, res as any);

      expect(mockedUser.find).toHaveBeenCalled();
      const filterArg = (mockedUser.find as jest.Mock).mock.calls[0][0];
      expect(filterArg).toHaveProperty("userType", "doctor");
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ searchType: "doctors" }),
        })
      );
    });
  });
});
