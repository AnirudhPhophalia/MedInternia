import { Agenda } from "agenda";
import Case from "../../models/Case";
import { ingestCase } from "../../services/ragService";
import {
  RAG_INGEST_JOB,
  processRagIngest,
  processRagIngestWithRetries,
  registerRagIngestJob,
  enqueueRagIngest,
} from "../ragIngestJob";

jest.mock("../../models/Case");
jest.mock("../../services/ragService", () => ({
  ingestCase: jest.fn().mockResolvedValue(undefined),
}));

const mockedCase = Case as jest.Mocked<typeof Case>;
const mockedIngestCase = ingestCase as jest.Mock;

describe("RAG Ingest Job", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("ingests original case text and metadata into RAG service for approved cases", async () => {
    mockedCase.findById.mockResolvedValue({
      _id: "case-100",
      title: "Cardiology Case Title",
      description: "Detailed description of symptoms and observations.",
      moderationStatus: "approved",
      specialization: "Cardiology",
      isPatientCase: false,
    } as any);

    await processRagIngest("case-100");

    expect(mockedCase.findById).toHaveBeenCalledWith("case-100");
    expect(mockedIngestCase).toHaveBeenCalledWith(
      "case-100",
      "Cardiology Case Title\nDetailed description of symptoms and observations.",
      {
        specialization: "Cardiology",
        isPatientCase: false,
      }
    );
  });

  it("does not ingest cases that do not exist or are not approved", async () => {
    mockedCase.findById.mockResolvedValueOnce(null);

    await processRagIngest("missing-case");
    expect(mockedIngestCase).not.toHaveBeenCalled();

    mockedCase.findById.mockResolvedValueOnce({
      _id: "case-pending",
      moderationStatus: "pending",
    } as any);

    await processRagIngest("case-pending");
    expect(mockedIngestCase).not.toHaveBeenCalled();

    mockedCase.findById.mockResolvedValueOnce({
      _id: "case-flagged",
      moderationStatus: "changes_requested",
    } as any);

    await processRagIngest("case-flagged");
    expect(mockedIngestCase).not.toHaveBeenCalled();
  });

  it("retries exponential backoff when RAG service ingestion fails and throws exhausted error", async () => {
    mockedCase.findById.mockResolvedValue({
      _id: "case-fail",
      title: "Title",
      description: "Description",
      moderationStatus: "approved",
      specialization: "Pediatrics",
      isPatientCase: true,
    } as any);

    mockedIngestCase.mockRejectedValue(new Error("RAG service unavailable"));

    const wait = jest.fn().mockResolvedValue(undefined);
    const errorSpy = jest.spyOn(console, "error").mockImplementation();

    await expect(
      processRagIngestWithRetries("case-fail", wait)
    ).rejects.toThrow("RAG service unavailable");

    expect(mockedIngestCase).toHaveBeenCalledTimes(3);
    expect(wait).toHaveBeenNthCalledWith(1, 2_000);
    expect(wait).toHaveBeenNthCalledWith(2, 4_000);

    errorSpy.mockRestore();
  });

  it("registers job definition with Agenda", () => {
    const scheduler = {
      define: jest.fn(),
    } as unknown as Agenda;

    registerRagIngestJob(scheduler);

    expect(scheduler.define).toHaveBeenCalledWith(
      RAG_INGEST_JOB,
      expect.objectContaining({
        concurrency: 3,
        lockLifetime: 120_000,
      }),
      expect.any(Function)
    );
  });

  it("enqueues a RAG ingest job in Agenda", async () => {
    const mockSave = jest.fn().mockResolvedValue(undefined);
    const mockSchedule = jest.fn().mockReturnValue({ save: mockSave });
    const mockUnique = jest.fn().mockReturnValue({ schedule: mockSchedule });
    const mockCreate = jest.fn().mockReturnValue({ unique: mockUnique });

    const scheduler = {
      create: mockCreate,
    } as unknown as Agenda;

    await enqueueRagIngest("case-enqueue-1", scheduler);

    expect(mockCreate).toHaveBeenCalledWith(RAG_INGEST_JOB, {
      caseId: "case-enqueue-1",
    });
    expect(mockUnique).toHaveBeenCalledWith({
      name: RAG_INGEST_JOB,
      "data.caseId": "case-enqueue-1",
    });
    expect(mockSave).toHaveBeenCalled();
  });
});
