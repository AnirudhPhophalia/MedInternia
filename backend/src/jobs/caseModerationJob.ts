import { createAgenda } from "../config/agenda";
import Case from "../models/Case";
import User from "../models/User";
import { checkCompliance } from "../services/nerService";
import { ingestCase } from "../services/ragService";

export const CASE_MODERATION_JOB = "moderate-case-compliance";

interface CaseModerationJobData {
  caseId: string;
}

const registeredSchedulers = new WeakSet<object>();
let agenda: any;
const MAX_MODERATION_ATTEMPTS = 3;
const BASE_RETRY_DELAY_MS = 2_000;

type Delay = (milliseconds: number) => Promise<void>;

const delay: Delay = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

const getAgenda = (): any => {
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
  const caseDoc: any = await Case.findOne({
    _id: caseId,
    moderationStatus: "pending",
  });

  if (!caseDoc) {
    return;
  }

  const patientAge = caseDoc.patientInfo?.age;
  const titleResult = await checkCompliance(caseDoc.title, patientAge);
  const descResult = await checkCompliance(caseDoc.description, patientAge);

  const isFlagged = titleResult.is_flagged || descResult.is_flagged;
  const flagReasons = [...(titleResult.flag_reasons || []), ...(descResult.flag_reasons || [])];

  if (!isFlagged) {
    const updated = await Case.findOneAndUpdate(
      { _id: caseId, moderationStatus: "pending" },
      {
        $set: {
          moderationStatus: "approved",
          moderationReason: undefined,
          pointsAwarded: 10,
          reviewedAt: new Date(),
        },
        $push: {
          moderationAuditTrail: {
            status: "approved",
            timestamp: new Date(),
          },
        },
      }
    );

    if (updated) {
      if (caseDoc.doctor || caseDoc.author) {
        await User.findByIdAndUpdate(caseDoc.doctor || caseDoc.author, {
          $inc: { points: 10 },
        });
      }

      try {
        await ingestCase(
          caseId,
          `${caseDoc.title}\n${caseDoc.description}`,
          {
            specialization: caseDoc.specialization,
            isPatientCase: caseDoc.isPatientCase,
          }
        );
      } catch (ingestErr) {
        console.warn(`RAG Ingest warning for case ${caseId}:`, ingestErr);
      }
    }
  } else {
    const reasonText = buildReason(flagReasons) || "Failed automatic HIPAA/PII compliance check";

    const updateSet: any = {
      moderationStatus: "changes_requested",
      moderationReason: reasonText,
      title: titleResult.redacted_text,
      description: descResult.redacted_text,
      reviewedAt: new Date(),
    };

    if (!caseDoc.get?.("originalTitle")) {
      updateSet.originalTitle = caseDoc.title;
    }
    if (!caseDoc.get?.("originalDescription")) {
      updateSet.originalDescription = caseDoc.description;
    }

    await Case.findOneAndUpdate(
      { _id: caseId, moderationStatus: "pending" },
      {
        $set: updateSet,
        $push: {
          moderationAuditTrail: {
            status: "changes_requested",
            reason: reasonText,
            timestamp: new Date(),
          },
        },
      }
    );
  }
}

export async function processCaseModerationWithRetries(
  caseId: string,
  delayFn: Delay = delay
): Promise<void> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_MODERATION_ATTEMPTS; attempt++) {
    try {
      await processCaseModeration(caseId);
      return;
    } catch (error) {
      lastError = error;
      console.warn(
        `Case moderation attempt ${attempt}/${MAX_MODERATION_ATTEMPTS} failed for case ${caseId}:`,
        error
      );

      if (attempt < MAX_MODERATION_ATTEMPTS) {
        await delayFn(BASE_RETRY_DELAY_MS * attempt);
      }
    }
  }

  try {
    const failureReason =
      lastError instanceof Error ? lastError.message : "Unknown processing error";

    await Case.findOneAndUpdate(
      { _id: caseId, moderationStatus: "pending" },
      {
        $set: {
          moderationStatus: "failed",
          moderationReason: failureReason,
        },
        $push: {
          moderationAuditTrail: {
            status: "failed",
            reason: failureReason,
            timestamp: new Date(),
          },
        },
      }
    );
  } catch (markError) {
    console.error(`Failed to mark case ${caseId} as failed:`, markError);
  }
  throw lastError;
}

export function registerCaseModerationJob(scheduler: any = getAgenda()): void {
  if (registeredSchedulers.has(scheduler)) return;
  registeredSchedulers.add(scheduler);

  scheduler.define(
    CASE_MODERATION_JOB,
    {
      concurrency: 3,
      lockLifetime: 120_000,
    },
    async (job: any) => {
      await processCaseModerationWithRetries(job.attrs.data.caseId);
    }
  );
}

export async function enqueueCaseModeration(caseId: string): Promise<void> {
  const job = getAgenda()
    .create(CASE_MODERATION_JOB, { caseId })
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
  await agenda.drain?.();
  await agenda.stop?.();
  agenda = undefined;
}
