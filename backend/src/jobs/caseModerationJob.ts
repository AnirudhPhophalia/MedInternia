import { Agenda, Job } from "agenda";
import { createAgenda } from "../config/agenda";
import Case from "../models/Case";
import { checkCompliance } from "../services/nerService";
import { ingestCase } from "../services/ragService";

export const CASE_MODERATION_JOB = "moderate-case-compliance";

interface CaseModerationJobData {
  caseId: string;
}

const registeredSchedulers = new WeakSet<Agenda>();
let agenda: Agenda | undefined;
const MAX_MODERATION_ATTEMPTS = 3;
const BASE_RETRY_DELAY_MS = 2_000;

type Delay = (milliseconds: number) => Promise<void>;

const delay: Delay = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

const getAgenda = (): Agenda => {
  agenda ??= createAgenda();
  return agenda;
};

const buildReason = (reasons: string[]): string | undefined => {
  const uniqueReasons = [...new Set(reasons.filter(Boolean))];
  return uniqueReasons.length > 0
    ? uniqueReasons.join("; ").slice(0, 1000)
    : undefined;
};

export async function processCaseModeration(caseId: string): Promise<void> {
  const caseDoc = await Case.findOne({
    _id: caseId,
    moderationStatus: "pending",
  });

  if (!caseDoc) return;

  const patientAge = caseDoc.patientInfo?.age;
  const [titleResult, descriptionResult] = await Promise.all([
    checkCompliance(caseDoc.title, patientAge),
    checkCompliance(caseDoc.description, patientAge),
  ]);

  const isFlagged = titleResult.is_flagged || descriptionResult.is_flagged;
  const status = isFlagged ? "changes_requested" : "approved";
  const reason = buildReason([
    ...titleResult.flag_reasons,
    ...descriptionResult.flag_reasons,
  ]);
  const reviewedAt = new Date();

  const updatedCase = await Case.findOneAndUpdate(
    { _id: caseId, moderationStatus: "pending" },
    {
      $set: {
        title: titleResult.redacted_text,
        description: descriptionResult.redacted_text,
        moderationStatus: status,
        moderationReason: reason,
        reviewedAt,
      },
      $push: {
        moderationAuditTrail: {
          status,
          reason,
          reviewedAt,
        },
      },
    }
  );

  if (status === "approved" && updatedCase) {
    try {
      await ingestCase(
        caseId,
        `${titleResult.redacted_text}\n${descriptionResult.redacted_text}`,
        {
          specialization: caseDoc.specialization,
          isPatientCase: caseDoc.isPatientCase,
        }
      );
    } catch (error) {
      console.error(`RAG ingestion failed for moderated case ${caseId}:`, error);
    }
  }
}

export async function markCaseModerationFailed(
  caseId: string,
  error: Error
): Promise<void> {
  const reason = "Automated compliance moderation failed after retries";
  const reviewedAt = new Date();

  await Case.findOneAndUpdate(
    { _id: caseId, moderationStatus: "pending" },
    {
      $set: {
        moderationStatus: "failed",
        moderationReason: reason,
        reviewedAt,
      },
      $push: {
        moderationAuditTrail: {
          status: "failed",
          reason,
          reviewedAt,
        },
      },
    }
  );

  console.error(`Compliance moderation exhausted retries for case ${caseId}:`, error);
}

export async function processCaseModerationWithRetries(
  caseId: string,
  wait: Delay = delay
): Promise<void> {
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= MAX_MODERATION_ATTEMPTS; attempt += 1) {
    try {
      await processCaseModeration(caseId);
      return;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt < MAX_MODERATION_ATTEMPTS) {
        await wait(BASE_RETRY_DELAY_MS * 2 ** (attempt - 1));
      }
    }
  }

  await markCaseModerationFailed(caseId, lastError!);
  throw lastError;
}

export function registerCaseModerationJob(scheduler: Agenda = getAgenda()): void {
  if (registeredSchedulers.has(scheduler)) return;
  registeredSchedulers.add(scheduler);

  scheduler.define<CaseModerationJobData>(
    CASE_MODERATION_JOB,
    {
      concurrency: 3,
      lockLifetime: 120_000,
    },
    async (job: Job<CaseModerationJobData>) => {
      await processCaseModerationWithRetries(job.attrs.data.caseId);
    }
  );
}

export async function enqueueCaseModeration(caseId: string): Promise<void> {
  const job = getAgenda()
    .create<CaseModerationJobData>(CASE_MODERATION_JOB, { caseId })
    .unique({ name: CASE_MODERATION_JOB, "data.caseId": caseId })
    .schedule(new Date());

  await job.save();
}

export async function startBackgroundJobs(): Promise<void> {
  const scheduler = getAgenda();
  registerCaseModerationJob(scheduler);
  await scheduler.start();
}

export async function stopBackgroundJobs(): Promise<void> {
  if (!agenda) return;
  await agenda.drain();
  await agenda.close();
  agenda = undefined;
}
