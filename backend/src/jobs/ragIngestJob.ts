import { Agenda, Job } from "agenda";
import { createAgenda } from "../config/agenda";
import Case from "../models/Case";
import { ingestCase } from "../services/ragService";

export const RAG_INGEST_JOB = "ingest-case-rag";

export interface RagIngestJobData {
  caseId: string;
}

const registeredSchedulers = new WeakSet<Agenda>();
let agenda: Agenda | undefined;
const MAX_INGEST_ATTEMPTS = 3;
const BASE_RETRY_DELAY_MS = 2_000;

type Delay = (milliseconds: number) => Promise<void>;

const delay: Delay = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

const getAgenda = (): Agenda => {
  agenda ??= createAgenda();
  return agenda;
};

export async function processRagIngest(caseId: string): Promise<void> {
  const caseDoc = await Case.findById(caseId);

  if (!caseDoc || caseDoc.moderationStatus !== "approved") {
    return;
  }

  // Use the original (unredacted) text for RAG ingestion on approved cases.
  await ingestCase(
    caseId,
    `${caseDoc.title}\n${caseDoc.description}`,
    {
      specialization: caseDoc.specialization,
      isPatientCase: caseDoc.isPatientCase,
    }
  );
}

export async function processRagIngestWithRetries(
  caseId: string,
  wait: Delay = delay
): Promise<void> {
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= MAX_INGEST_ATTEMPTS; attempt += 1) {
    try {
      await processRagIngest(caseId);
      return;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt < MAX_INGEST_ATTEMPTS) {
        await wait(BASE_RETRY_DELAY_MS * 2 ** (attempt - 1));
      }
    }
  }

  console.error(`RAG ingestion exhausted retries for case ${caseId}:`, lastError);
  throw lastError;
}

export function registerRagIngestJob(scheduler: Agenda = getAgenda()): void {
  if (registeredSchedulers.has(scheduler)) return;
  registeredSchedulers.add(scheduler);

  scheduler.define<RagIngestJobData>(
    RAG_INGEST_JOB,
    {
      concurrency: 3,
      lockLifetime: 120_000,
    },
    async (job: Job<RagIngestJobData>) => {
      await processRagIngestWithRetries(job.attrs.data.caseId);
    }
  );
}

export async function enqueueRagIngest(
  caseId: string,
  scheduler: Agenda = getAgenda()
): Promise<void> {
  const job = scheduler
    .create<RagIngestJobData>(RAG_INGEST_JOB, { caseId })
    .unique({ name: RAG_INGEST_JOB, "data.caseId": caseId })
    .schedule(new Date());

  await job.save();
}
