/**
 * backend/src/services/ragService.ts
 * ===================================
 * Client that calls the Python RAG microservice.
 */

const RAG_SERVICE_URL = process.env.RAG_SERVICE_URL ?? "http://localhost:8000";

export interface SimilarCase {
  case_id: string;
  score: number;
  metadata: Record<string, any>;
  text_snippet: string;
}

export async function ingestCase(caseId: string, text: string, metadata: Record<string, any> = {}): Promise<void> {
  try {
    const res = await fetch(`${RAG_SERVICE_URL}/api/ingest-case`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ case_id: caseId, text, metadata }),
      signal: AbortSignal.timeout(30_000),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "(no body)");
      console.error(`RAG ingest failed for case ${caseId} (${res.status}): ${body}`);
    }
  } catch (err) {
    console.error(`Failed to reach RAG service for ingestion (case ${caseId}):`, err);
  }
}

export async function suggestCases(text: string, k: number = 3): Promise<SimilarCase[]> {
  try {
    const res = await fetch(`${RAG_SERVICE_URL}/api/suggest-cases`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, k }),
      signal: AbortSignal.timeout(30_000),
    });

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
