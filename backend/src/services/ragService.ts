import { resilientFetch } from "../utils/resilientHttpClient";

const RAG_SERVICE_URL = process.env.RAG_SERVICE_URL ?? "http://localhost:8000";

export interface SimilarCase {
  case_id: string;
  score: number;
  metadata: Record<string, any>;
  text_snippet: string;
}

const RAG_RESILIENT_OPTIONS = {
  name: "python-rag-service",
  timeoutMs: 10000,
  maxRetries: 3,
  retryDelayMs: 200,
};

export async function ingestCase(caseId: string, text: string, metadata: Record<string, any> = {}): Promise<void> {
  let res: Response;
  try {
    const res = await resilientFetch(
      `${RAG_SERVICE_URL}/api/ingest-case`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Internal-Token": process.env.RAG_INTERNAL_SECRET ?? "",
        },
        body: JSON.stringify({ case_id: caseId, text, metadata }),
      },
      RAG_RESILIENT_OPTIONS
    );

    if (!res.ok) {
      const body = await res.text().catch(() => "(no body)");
      console.error(`RAG ingest failed for case ${caseId} (${res.status}): ${body}`);
    }
  } catch (err) {
    console.error(`Failed to reach RAG service for ingestion (case ${caseId}):`, err);
    throw err;
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "(no body)");
    const errorMsg = `RAG ingest failed for case ${caseId} (${res.status}): ${body}`;
    console.error(errorMsg);
    throw new Error(errorMsg);
  }
}

export async function deleteCaseVectors(caseId: string): Promise<void> {
  try {
    const res = await resilientFetch(
      `${RAG_SERVICE_URL}/api/delete-case`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Internal-Token": process.env.RAG_INTERNAL_SECRET ?? "",
        },
        body: JSON.stringify({ case_id: caseId }),
      },
      RAG_RESILIENT_OPTIONS
    );

    if (!res.ok) {
      const body = await res.text().catch(() => "(no body)");
      console.error(`RAG delete failed for case ${caseId} (${res.status}): ${body}`);
    }
  } catch (err) {
    console.error(`Failed to reach RAG service for deletion (case ${caseId}):`, err);
  }
}

export async function suggestCases(text: string, k: number = 3): Promise<SimilarCase[]> {
  try {
    const res = await resilientFetch(
      `${RAG_SERVICE_URL}/api/suggest-cases`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Internal-Token": process.env.RAG_INTERNAL_SECRET ?? "",
        },
        body: JSON.stringify({ text, k }),
      },
      RAG_RESILIENT_OPTIONS
    );

    if (!res.ok) {
      const body = await res.text().catch(() => "(no body)");
      console.error(`RAG suggest failed (${res.status}): ${body}`);
      return [];
    }

    const data = await res.json();
    return data.results || [];
  } catch (err) {
    console.error("Failed to reach RAG service for suggestions:", err);
    return [];
  }
}

