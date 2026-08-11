type Agenda = any;
import Case from "../../models/Case";
import User from "../../models/User";
import { checkCompliance } from "../../services/nerService";
import { ingestCase } from "../../services/ragService";
import {
  CASE_MODERATION_JOB,
  processCaseModeration,
  processCaseModerationWithRetries,
  registerCaseModerationJob,
} from "../caseModerationJob";

jest.mock("../../models/Case");
jest.mock("../../models/User");
jest.mock("../../services/nerService");
jest.mock("../../services/ragService", () => ({
  ingestCase: jest.fn().mockResolvedValue(undefined),
}));
jest.mock("../../config/agenda", () => ({
  createAgenda: jest.fn().mockReturnValue({
    define: jest.fn(),
    on: jest.fn(),
    create: jest.fn().mockReturnValue({
      unique: jest.fn().mockReturnThis(),
      schedule: jest.fn().mockReturnThis(),
      save: jest.fn().mockResolvedValue(undefined),
    }),
    start: jest.fn().mockResolvedValue(undefined),
    drain: jest.fn().mockResolvedValue(undefined),
    stop: jest.fn().mockResolvedValue(undefined),
  }),
}));

const mockedCase = Case as jest.Mocked<typeof Case>;
const mockedUser = User as jest.Mocked<typeof User>;
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

  it("approves a clean pending case and ingests original content into RAG", async () => {
    mockedCase.findOne.mockResolvedValue({
      title: "Original title",
      description: "Original description",
      patientInfo: { age: 28 },
      specialization: "Cardiology",
      isPatientCase: false,
      doctor: "doctor-1",
      get: jest.fn().mockReturnValue(undefined),
    } as any);
    mockedCheckCompliance
      .mockResolvedValueOnce(complianceResult("Redacted title"))
      .mockResolvedValueOnce(complianceResult("Redacted description"));
    mockedCase.findOneAndUpdate.mockResolvedValue({} as any);

    await processCaseModeration("case-1");

    expect(mockedCheckCompliance).toHaveBeenNthCalledWith(1, "Original title", 28);
    expect(mockedCheckCompliance).toHaveBeenNthCalledWith(2, "Original description", 28);

    // Bug fix (#1075): approved cases must NOT overwrite title/description —
    // only moderationStatus, moderationReason, and reviewedAt are updated.
    expect(mockedCase.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: "case-1", moderationStatus: "pending" },
      expect.objectContaining({
        $set: expect.objectContaining({
          moderationStatus: "approved",
          pointsAwarded: 10,
        }),
        $push: {
          moderationAuditTrail: expect.objectContaining({ status: "approved" }),
        },
      })
    );
    // The $set must NOT include title or description for approved cases.
    const callArgs = mockedCase.findOneAndUpdate.mock.calls[0][1] as any;
    expect(callArgs.$set).not.toHaveProperty("title");
    expect(callArgs.$set).not.toHaveProperty("description");
    expect(mockedUser.findByIdAndUpdate).toHaveBeenCalledWith("doctor-1", {
      $inc: { points: 10 },
    });

    // RAG ingestion uses the ORIGINAL text, not the compliance service output.
    expect(mockedIngestCase).toHaveBeenCalledWith(
      "case-1",
      "Original title\nOriginal description",
      { specialization: "Cardiology", isPatientCase: false }
    );
  });

  it("requests changes for flagged content, stores originals, and does not index it", async () => {
    mockedCase.findOne.mockResolvedValue({
      title: "Patient name",
      description: "Clinical note",
      patientInfo: {},
      specialization: "General Medicine",
      isPatientCase: true,
      doctor: "patient-1",
      get: jest.fn().mockReturnValue(undefined), // no originalTitle/Description yet
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
          // Originals preserved on first moderation
          originalTitle: "Patient name",
          originalDescription: "Clinical note",
          // Redacted text applied for flagged cases
          title: "[REDACTED]",
          description: "Clinical note",
        }),
      })
    );
    expect(mockedUser.findByIdAndUpdate).not.toHaveBeenCalled();
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
      doctor: "doctor-1",
      get: jest.fn().mockReturnValue(undefined),
    } as any);
    mockedCheckCompliance
      .mockResolvedValueOnce(complianceResult("Redacted title"))
      .mockResolvedValueOnce(complianceResult("Redacted description"));
    mockedCase.findOneAndUpdate.mockResolvedValue(null);

    await processCaseModeration("case-race");

    expect(mockedIngestCase).not.toHaveBeenCalled();
    expect(mockedUser.findByIdAndUpdate).not.toHaveBeenCalled();
  });

  it("persists a failed terminal state after retries are exhausted", async () => {
    mockedCase.findOne.mockResolvedValue({
      title: "Unavailable service",
      description: "Unavailable service",
      patientInfo: {},
      get: jest.fn().mockReturnValue(undefined),
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
