import { Response } from "express";
import {
  createCollection,
  getUserCollections,
  getCollectionById,
  addCaseToCollection,
  removeCaseFromCollection
} from "../collectionController";
import Collection from "../../models/Collection";
import Case from "../../models/Case";
import mongoose from "mongoose";

jest.mock("../../models/Collection");
jest.mock("../../models/Case");

const mockedCollection = Collection as unknown as jest.Mocked<typeof Collection>;
const mockedCase = Case as unknown as jest.Mocked<typeof Case>;

const mockResponse = () => {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res as Response;
};

const mockRequest = (userId: string, body: any = {}, params: any = {}) => ({
  user: { id: userId },
  body,
  params,
} as any);

describe("Collection Controller", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("createCollection", () => {
    it("returns 400 if name is missing", async () => {
      const req = mockRequest("user-1", { description: "Test" });
      const res = mockResponse();

      await createCollection(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Collection name is required' });
    });

    it("creates a collection successfully", async () => {
      const req = mockRequest("user-1", { name: "My Collection", description: "Test", isPublic: true });
      const res = mockResponse();

      const mockCol = { _id: "col-1", name: "My Collection" };
      mockedCollection.create.mockResolvedValue(mockCol as any);

      await createCollection(req, res);

      expect(mockedCollection.create).toHaveBeenCalledWith({
        name: "My Collection",
        description: "Test",
        isPublic: true,
        user: "user-1",
        cases: []
      });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ success: true, data: mockCol });
    });
  });

  describe("getUserCollections", () => {
    it("fetches collections scoped to the logged-in user", async () => {
      const req = mockRequest("user-1");
      const res = mockResponse();

      const sortMock = jest.fn().mockResolvedValue([{ _id: "col-1" }]);
      mockedCollection.find.mockReturnValue({ sort: sortMock } as any);

      await getUserCollections(req, res);

      expect(mockedCollection.find).toHaveBeenCalledWith({ user: "user-1" });
      expect(sortMock).toHaveBeenCalledWith({ createdAt: -1 });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ success: true, data: [{ _id: "col-1" }] });
    });
  });

  describe("getCollectionById", () => {
    it("returns 404 when collection is missing", async () => {
      const req = mockRequest("user-1", {}, { id: "col-1" });
      const res = mockResponse();

      mockedCollection.findById.mockReturnValue({ populate: jest.fn().mockResolvedValue(null) } as any);

      await getCollectionById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Collection not found' });
    });

    it("returns 403 when private and not owned", async () => {
      const req = mockRequest("user-1", {}, { id: "col-1" });
      const res = mockResponse();

      const mockCol = { _id: "col-1", user: "user-2", isPublic: false };
      mockedCollection.findById.mockReturnValue({ populate: jest.fn().mockResolvedValue(mockCol) } as any);

      await getCollectionById(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Not authorized to view this collection' });
    });

    it("returns collection and populates cases correctly when public and not owned", async () => {
      const req = mockRequest("user-1", {}, { id: "col-1" });
      const res = mockResponse();

      const mockCol = { _id: "col-1", user: "user-2", isPublic: true, cases: [] };
      const populateMock = jest.fn().mockResolvedValue(mockCol);
      mockedCollection.findById.mockReturnValue({ populate: populateMock } as any);

      await getCollectionById(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ success: true, data: mockCol });
      
      // We explicitly check that populate is called correctly to catch the 'author' vs 'doctor' bug
      // Actually we will just expect it to be called with any object for now, or match the exact path in controller.
      expect(populateMock).toHaveBeenCalledWith({
        path: 'cases',
        populate: { path: 'author', select: 'firstName lastName profilePicture designation' }
      });
    });

    it("returns collection when owned", async () => {
      const req = mockRequest("user-1", {}, { id: "col-1" });
      const res = mockResponse();

      const mockCol = { _id: "col-1", user: { toString: () => "user-1" }, isPublic: false, cases: [] };
      mockedCollection.findById.mockReturnValue({ populate: jest.fn().mockResolvedValue(mockCol) } as any);

      await getCollectionById(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ success: true, data: mockCol });
    });
  });

  describe("addCaseToCollection", () => {
    it("returns 400 if caseId is missing", async () => {
      const req = mockRequest("user-1", {}, { id: "col-1" });
      const res = mockResponse();

      await addCaseToCollection(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("returns 404 if collection not found", async () => {
      const req = mockRequest("user-1", { caseId: new mongoose.Types.ObjectId().toString() }, { id: "col-1" });
      const res = mockResponse();

      mockedCollection.findById.mockResolvedValue(null);

      await addCaseToCollection(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("returns 403 for non-owners", async () => {
      const req = mockRequest("user-1", { caseId: new mongoose.Types.ObjectId().toString() }, { id: "col-1" });
      const res = mockResponse();

      const mockCol = { _id: "col-1", user: { toString: () => "user-2" } };
      mockedCollection.findById.mockResolvedValue(mockCol as any);

      await addCaseToCollection(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it("returns 404 on missing case", async () => {
      const caseId = new mongoose.Types.ObjectId().toString();
      const req = mockRequest("user-1", { caseId }, { id: "col-1" });
      const res = mockResponse();

      const mockCol = { _id: "col-1", user: { toString: () => "user-1" } };
      mockedCollection.findById.mockResolvedValue(mockCol as any);
      mockedCase.findById.mockResolvedValue(null);

      await addCaseToCollection(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Case not found' });
    });

    it("rejects duplicates", async () => {
      const caseId = new mongoose.Types.ObjectId().toString();
      const req = mockRequest("user-1", { caseId }, { id: "col-1" });
      const res = mockResponse();

      const mockCol = { _id: "col-1", user: { toString: () => "user-1" }, cases: { includes: jest.fn().mockReturnValue(true) } };
      mockedCollection.findById.mockResolvedValue(mockCol as any);
      mockedCase.findById.mockResolvedValue({ _id: caseId } as any);

      await addCaseToCollection(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Case already in collection' });
    });

    it("adds case to collection successfully", async () => {
      const caseId = new mongoose.Types.ObjectId().toString();
      const req = mockRequest("user-1", { caseId }, { id: "col-1" });
      const res = mockResponse();

      const mockCol = { _id: "col-1", user: { toString: () => "user-1" }, cases: [], save: jest.fn() };
      mockedCollection.findById.mockResolvedValue(mockCol as any);
      mockedCase.findById.mockResolvedValue({ _id: caseId } as any);

      await addCaseToCollection(req, res);

      expect(mockCol.cases).toHaveLength(1);
      expect(mockCol.save).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, message: 'Case added to collection' }));
    });
  });

  describe("removeCaseFromCollection", () => {
    it("returns 404 if collection not found", async () => {
      const req = mockRequest("user-1", {}, { id: "col-1", caseId: "case-1" });
      const res = mockResponse();

      mockedCollection.findById.mockResolvedValue(null);

      await removeCaseFromCollection(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("returns 403 for non-owners", async () => {
      const req = mockRequest("user-1", {}, { id: "col-1", caseId: "case-1" });
      const res = mockResponse();

      const mockCol = { _id: "col-1", user: { toString: () => "user-2" } };
      mockedCollection.findById.mockResolvedValue(mockCol as any);

      await removeCaseFromCollection(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it("removes case from collection", async () => {
      const req = mockRequest("user-1", {}, { id: "col-1", caseId: "case-1" });
      const res = mockResponse();

      const mockCol = { _id: "col-1", user: { toString: () => "user-1" }, cases: ["case-1", "case-2"], save: jest.fn() };
      mockedCollection.findById.mockResolvedValue(mockCol as any);

      await removeCaseFromCollection(req, res);

      expect(mockCol.cases).toEqual(["case-2"]);
      expect(mockCol.save).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });
});
