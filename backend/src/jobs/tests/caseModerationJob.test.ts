import { Agenda } from "agenda";
import Case from "../../models/Case";
import { checkCompliance } from "../../services/nerService";
import { ingestCase } from "../../services/ragService";
import {
  CASE_MODERATION_JOB,
  processCaseModeration,
  processCaseModerationWithRetries,
  registerCaseModerationJob,
} from "../caseModerationJob";

jest.mock("../../models/Case");
jest.mock("../../services/nerService");
jest.mock("../../services/ragService", () => ({
  ingestCase: jest.fn().mockResolvedValue(undefined),
}));

const mockedCase = Case as jest.Mocked<typeof Case>;
const mockedCheckCompliance = checkCompliance as jest.Mock;
const mockedIngestCase = ingestCase as jest.Mock;

const complianceResult = (
  redactedText: string,
  isFlagged = false,
  flagReasons: string[] = []
) => ({
  original_text: redactedText,
  redacted_text: redactedText,
  is_flagged: isFlagged,
  flag_reasons: flagReasons,
});

describe("case moderation job", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("redacts and approves a clean pending case before RAG ingestion", async () => {
    mockedCase.findOne.mockResolvedValue({
      title: "Original title",
      description: "Original description",
      patientInfo: { age: 28 },
      specialization: "Cardiology",
      isPatientCase: false,
    } as any);
    mockedCheckCompliance
      .mockResolvedValueOnce(complianceResult("Redacted title"))
      .mockResolvedValueOnce(complianceResult("Redacted description"));
    mockedCase.findOneAndUpdate.mockResolvedValue({} as any);

    await processCaseModeration("case-1");

    expect(mockedCheckCompliance).toHaveBeenNthCalledWith(1, "Original title", 28);
    expect(mockedCheckCompliance).toHaveBeenNthCalledWith(2, "Original description", 28);
    expect(mockedCase.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: "case-1", moderationStatus: "pending" },
      expect.objectContaining({
        $set: expect.objectContaining({
          title: "Redacted title",
          description: "Redacted description",
          moderationStatus: "approved",
        }),
        $push: {
          moderationAuditTrail: expect.objectContaining({ status: "approved" }),
        },
      })
    );
    expect(mockedIngestCase).toHaveBeenCalledWith(
      "case-1",
      "Redacted title\nRedacted description",
      { specialization: "Cardiology", isPatientCase: false }
    );
  });

  it("requests changes for flagged content and does not index it", async () => {
    mockedCase.findOne.mockResolvedValue({
      title: "Patient name",
      description: "Clinical note",
      patientInfo: {},
      specialization: "General Medicine",
      isPatientCase: true,
    } as any);
    mockedCheckCompliance
      .mockResolvedValueOnce(
        complianceResult("[REDACTED]", true, ["PHI detected"])
      )
      .mockResolvedValueOnce(
        complianceResult("Clinical note", true, ["PHI detected", "Age mismatch"])
      );
    mockedCase.findOneAndUpdate.mockResolvedValue({} as any);

    await processCaseModeration("case-2");

    expect(mockedCase.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: "case-2", moderationStatus: "pending" },
      expect.objectContaining({
        $set: expect.objectContaining({
          moderationStatus: "changes_requested",
          moderationReason: "PHI detected; Age mismatch",
        }),
      })
    );
    expect(mockedIngestCase).not.toHaveBeenCalled();
  });

  it("is idempotent when the case is no longer pending", async () => {
    mockedCase.findOne.mockResolvedValue(null);

    await processCaseModeration("case-3");

    expect(mockedCheckCompliance).not.toHaveBeenCalled();
    expect(mockedCase.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it("does not index a case changed by another moderator", async () => {
    mockedCase.findOne.mockResolvedValue({
      title: "Original title",
      description: "Original description",
      patientInfo: {},
      specialization: "Cardiology",
      isPatientCase: false,
    } as any);
    mockedCheckCompliance
      .mockResolvedValueOnce(complianceResult("Redacted title"))
      .mockResolvedValueOnce(complianceResult("Redacted description"));
    mockedCase.findOneAndUpdate.mockResolvedValue(null);

    await processCaseModeration("case-race");

    expect(mockedIngestCase).not.toHaveBeenCalled();
  });

  it("persists a failed terminal state after retries are exhausted", async () => {
    mockedCase.findOne.mockResolvedValue({
      title: "Unavailable service",
      description: "Unavailable service",
      patientInfo: {},
    } as any);
    mockedCheckCompliance.mockRejectedValue(new Error("service offline"));
    mockedCase.findOneAndUpdate.mockResolvedValue({} as any);
    const wait = jest.fn().mockResolvedValue(undefined);
    const errorSpy = jest.spyOn(console, "error").mockImplementation();

    await expect(
      processCaseModerationWithRetries("case-4", wait)
    ).rejects.toThrow("service offline");

    expect(wait).toHaveBeenNthCalledWith(1, 2_000);
    expect(wait).toHaveBeenNthCalledWith(2, 4_000);
    expect(mockedCase.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: "case-4", moderationStatus: "pending" },
      expect.objectContaining({
        $set: expect.objectContaining({ moderationStatus: "failed" }),
        $push: {
          moderationAuditTrail: expect.objectContaining({ status: "failed" }),
        },
      })
    );
    errorSpy.mockRestore();
  });

  it("registers exponential retries and an exhausted-retry handler", () => {
    const scheduler = {
      define: jest.fn(),
      on: jest.fn(),
    } as unknown as Agenda;

    registerCaseModerationJob(scheduler);

    expect(scheduler.define).toHaveBeenCalledWith(
      CASE_MODERATION_JOB,
      expect.objectContaining({
        concurrency: 3,
        lockLifetime: 120_000,
      }),
      expect.any(Function)
    );
  });
});
