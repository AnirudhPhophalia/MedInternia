import { Agenda, Job } from "agenda";
import { createAgenda } from "../config/agenda";
import Case from "../models/Case";
import User from "../models/User";
import { checkCompliance } from "../services/nerService";
import { enqueueRagIngest, registerRagIngestJob } from "./ragIngestJob";

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

  // Bug fix (#1075): Only overwrite title/description when the case is flagged.
  // For approved cases we preserve the original content — the compliance service
  // should return the original text unchanged, but if it returns "" or null the
  // case content would be silently destroyed with no recovery path.
  // For flagged cases we store the original text in originalTitle/originalDescription
  // before overwriting, giving authors context about what was changed.
  const contentUpdate: Record<string, any> = {
    moderationStatus: status,
    moderationReason: reason,
    reviewedAt,
  };

  const pointsToAward = caseDoc.isPatientCase ? 5 : 10;
  if (status === "approved") {
    contentUpdate.pointsAwarded = pointsToAward;
  }

  if (isFlagged) {
    // Preserve originals on first moderation so the author can see what changed.
    // $setOnInsert-style logic: only set originalTitle if it isn't already set.
    if (!caseDoc.get("originalTitle")) {
      contentUpdate.originalTitle = caseDoc.title;
    }
    if (!caseDoc.get("originalDescription")) {
      contentUpdate.originalDescription = caseDoc.description;
    }
    // Only apply redacted text when the service actually returned non-empty content.
    if (titleResult.redacted_text) {
      contentUpdate.title = titleResult.redacted_text;
    }
    if (descriptionResult.redacted_text) {
      contentUpdate.description = descriptionResult.redacted_text;
    }
  }

  const updatedCase = await Case.findOneAndUpdate(
    { _id: caseId, moderationStatus: "pending" },
    {
      $set: contentUpdate,
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
    await User.findByIdAndUpdate(caseDoc.doctor, {
      $inc: { points: pointsToAward },
    });

    await enqueueRagIngest(caseId);
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

  // Bug fix (#1075): Wrap markCaseModerationFailed in its own try/catch so
  // that a DB connectivity error during failure-marking doesn't swallow
  // lastError — the case would otherwise stay "pending" indefinitely with
  // no indication of failure and Agenda would not record the job as failed.
  try {
    await markCaseModerationFailed(caseId, lastError!);
  } catch (markError) {
    console.error(`Failed to mark case ${caseId} as failed:`, markError);
  }
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
  registerRagIngestJob(scheduler);
  await scheduler.start();
}

export async function stopBackgroundJobs(): Promise<void> {
  if (!agenda) return;
  await agenda.drain();
  await agenda.close();
  agenda = undefined;
}
