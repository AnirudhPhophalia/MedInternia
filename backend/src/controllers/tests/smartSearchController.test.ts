import { Response } from "express";
import { smartSearch } from "../smartSearchController";
import JobOpportunity from "../../models/JobOpportunity";
import User from "../../models/User";
import { AuthRequest } from "../../middleware/auth";

jest.mock("../../models/JobOpportunity");
jest.mock("../../models/User");

const mockedJobOpportunity = JobOpportunity as unknown as jest.Mocked<typeof JobOpportunity>;
const mockedUser = User as unknown as jest.Mocked<typeof User>;

const mockResponse = () => {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res as Response;
};

const mockRequest = (query: any = {}): AuthRequest => ({
  query,
}) as unknown as AuthRequest;

describe("Smart Search Controller", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("smartSearch", () => {
    it("returns 400 when search query is empty or missing", async () => {
      const res = mockResponse();

      await smartSearch(mockRequest({ q: "" }) as any, res as any);
      expect(res.status).toHaveBeenCalledWith(400);

      await smartSearch(mockRequest({ q: "   " }) as any, res as any);
      expect(res.status).toHaveBeenCalledWith(400);

      await smartSearch(mockRequest({}) as any, res as any);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("parses 'jobs' search type and constructs JobOpportunity filter correctly", async () => {
      const req = mockRequest({ q: "remote internship in Mumbai" });
      const res = mockResponse();

      const limitMock = jest.fn().mockResolvedValue([{ _id: "job-1" }]);
      const sortMock = jest.fn().mockReturnValue({ limit: limitMock });
      const populate2Mock = jest.fn().mockReturnValue({ sort: sortMock });
      const populate1Mock = jest.fn().mockReturnValue({ populate: populate2Mock });
      mockedJobOpportunity.find.mockReturnValue({ populate: populate1Mock } as any);

      await smartSearch(req as any, res as any);

      expect(mockedJobOpportunity.find).toHaveBeenCalled();
      
      const filterArg = (mockedJobOpportunity.find as jest.Mock).mock.calls[0][0];
      expect(filterArg).toHaveProperty("isActive", true);
      expect(filterArg).toHaveProperty("applicationDeadline");
      expect(filterArg).toHaveProperty("type", "internship");
      expect(filterArg).toHaveProperty(["location.isRemote"], true);
      
      // Location matching check (Mumbai)
      expect(filterArg.$or).toEqual(
        expect.arrayContaining([
          { "location.city": expect.any(RegExp) },
          { "location.state": expect.any(RegExp) },
          { "location.country": expect.any(RegExp) }
        ])
      );

      // Verify the response shape includes intent and searchType
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            searchType: "jobs",
            intent: expect.objectContaining({
              searchType: "jobs",
              jobType: "internship",
              isRemote: true,
              location: "Mumbai"
            }),
            results: [{ _id: "job-1" }]
          })
        })
      );
    });

    it("parses 'doctors' search type and constructs User filter correctly", async () => {
      const req = mockRequest({ q: "cardiologist in Delhi" });
      const res = mockResponse();

      const limitMock = jest.fn().mockResolvedValue([{ _id: "doc-1" }]);
      const sortMock = jest.fn().mockReturnValue({ limit: limitMock });
      const selectMock = jest.fn().mockReturnValue({ sort: sortMock });
      mockedUser.find.mockReturnValue({ select: selectMock } as any);

      await smartSearch(req as any, res as any);

      expect(mockedUser.find).toHaveBeenCalled();
      
      const filterArg = (mockedUser.find as jest.Mock).mock.calls[0][0];
      expect(filterArg).toHaveProperty("userType", "doctor");
      expect(filterArg).toHaveProperty("isActive", true);
      expect(filterArg).toHaveProperty("specialization", expect.any(RegExp));
      
      // Check location regex array in $or
      expect(filterArg.$or).toEqual(
        expect.arrayContaining([
          { "address.city": expect.any(RegExp) },
          { "address.state": expect.any(RegExp) },
          { "address.country": expect.any(RegExp) }
        ])
      );

      // Verify the response shape
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            searchType: "doctors",
            intent: expect.objectContaining({
              searchType: "doctors",
              specialization: "cardiology",
              location: "Delhi"
            }),
            results: [{ _id: "doc-1" }]
          })
        })
      );
    });

    it("forces type override if 'type' query param is explicitly provided", async () => {
      const req = mockRequest({ q: "need a fellowship", type: "doctors" });
      const res = mockResponse();

      const limitMock = jest.fn().mockResolvedValue([]);
      const sortMock = jest.fn().mockReturnValue({ limit: limitMock });
      const selectMock = jest.fn().mockReturnValue({ sort: sortMock });
      mockedUser.find.mockReturnValue({ select: selectMock } as any);

      await smartSearch(req as any, res as any);

      // Even though 'fellowship' usually implies a job, the override forces User (doctors) search
      expect(mockedUser.find).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            searchType: "doctors"
          })
        })
      );
    });
  });
});
