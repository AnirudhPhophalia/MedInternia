# MedInternia — Biomedical NER Microservice

A lightweight **FastAPI** service that wraps two HuggingFace biomedical NER
checkpoints to extract structured medical entities from clinical case text.

---

## What it does

Given free-text like:

> "A 45-year-old male presented with **fever** and **chest pain**.
>  He was diagnosed with **STEMI**. **Aspirin 300 mg** was administered."

it returns:

```json
{
  "entities": [
    { "text": "fever",      "label": "SYMPTOM",    "score": 0.91, "start": 42, "end": 47 },
    { "text": "chest pain", "label": "SYMPTOM",    "score": 0.89, "start": 52, "end": 62 },
    { "text": "STEMI",      "label": "DISEASE",    "score": 0.98, "start": 91, "end": 96 },
    { "text": "Aspirin",    "label": "MEDICATION", "score": 0.97, "start": 98, "end": 105 }
  ],
  "entity_counts": { "SYMPTOM": 2, "DISEASE": 1, "MEDICATION": 1 }
}
```

---

## Models used

| Purpose | Checkpoint | Notes |
|---------|-----------|-------|
| Disease/Diagnosis | [`pruas/BENT-PubMedBERT-NER-Disease`](https://huggingface.co/pruas/BENT-PubMedBERT-NER-Disease) | Fine-tuned on NCBI Disease corpus |
| Symptoms + Medications | [`d4data/biomedical-ner-all`](https://huggingface.co/d4data/biomedical-ner-all) | Multi-entity biomedical NER |

Both run with `aggregation_strategy="simple"` so token fragments are merged
into clean word spans automatically. **No fine-tuning required.**

---

## Project layout

```
nlp/
├── app/
│   ├── __init__.py
│   └── main.py          ← FastAPI app, pipelines, routes
├── tests/
│   ├── __init__.py
│   └── test_ner_service.py
├── scripts/
│   └── download_models.py   ← pre-cache weights before first run
├── .env.example
├── Dockerfile
└── requirements.txt
```

---

## Quick start (local)

```bash
# 1 — clone & enter the directory
cd nlp_service

# 2 — create a virtual environment
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate

# 3 — install dependencies
pip install -r requirements.txt

# 4 — (optional but recommended) pre-download model weights
python scripts/download_models.py

# 5 — copy env template
Linux/macOS:

```bash
cp .env.example .env
```

Windows (Command Prompt):

```cmd
copy .env.example .env
```

Windows (PowerShell):

```powershell
Copy-Item .env.example .env
```

# 6 — start the server
uvicorn app.main:app --reload --port 8001
```

The service is now live at **http://localhost:8001**.

Interactive API docs: **http://localhost:8001/docs**

---

## Docker

```bash
# Build (weights are baked in during build — no internet at runtime)
docker build -t medinternia-ner:latest .

# Run
docker run -p 8001:8001 medinternia-ner:latest
```

---

## API reference

### `GET /health`

Returns `200 OK` when both models are loaded and ready.

```json
{ "status": "ok", "disease_model": "...", "general_model": "...", "device": "CPU" }
```

Returns `503` while models are still loading.

---

### `POST /extract`

Extract entities from a single case description.

**Request body**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `text` | string | ✅ | Clinical text (5–4 000 chars) |
| `case_id` | string | ❌ | Arbitrary ID, echoed back |

**Response**

```json
{
  "case_id": "optional-string-or-null",
  "entities": [
    {
      "text": "fever",
      "label": "SYMPTOM",
      "score": 0.91,
      "start": 42,
      "end": 47
    }
  ],
  "entity_counts": {
    "SYMPTOM": 1,
    "DISEASE": 0,
    "MEDICATION": 0
  },
  "processing_time_ms": 312.5
}
```

---

### `POST /batch_extract`

Process up to **20** texts in one round-trip. Body is a JSON array of the same
objects accepted by `/extract`. Returns a JSON array in the same order.

---

## Calling from Node.js (MedInternia backend)

```typescript
// backend/src/services/nerService.ts

const NER_SERVICE_URL = process.env.NER_SERVICE_URL ?? "http://localhost:8001";

export interface NEREntity {
  text: string;
  label: "SYMPTOM" | "DISEASE" | "MEDICATION";
  score: number;
  start: number;
  end: number;
}

export interface NERResult {
  case_id: string | null;
  entities: NEREntity[];
  entity_counts: { SYMPTOM: number; DISEASE: number; MEDICATION: number };
  processing_time_ms: number;
}

export async function extractEntities(
  text: string,
  caseId?: string
): Promise<NERResult> {
  const res = await fetch(`${NER_SERVICE_URL}/extract`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, case_id: caseId }),
  });

  if (!res.ok) {
    throw new Error(`NER service error ${res.status}: ${await res.text()}`);
  }

  return res.json() as Promise<NERResult>;
}
```

Add `NER_SERVICE_URL=http://localhost:8001` to the backend `.env`.

---

## Running tests

```bash
pytest tests/ -v
```

All tests use mocked pipelines — **no model download required** to run the
test suite.

---

## Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DISEASE_MODEL` | `pruas/BENT-PubMedBERT-NER-Disease` | HF Hub checkpoint for diseases |
| `GENERAL_BIO_MODEL` | `d4data/biomedical-ner-all` | HF Hub checkpoint for symptoms & meds |
| `PORT` | `8001` | Uvicorn listen port |
| `CORS_ORIGINS` | `http://localhost:3000` | Comma-separated allowed origins |
| `MAX_CHARS` | `4000` | Maximum input text length |

---

## How it integrates with MedInternia

```
┌─────────────────────┐   POST /cases (create)   ┌──────────────────────┐
│  Next.js Frontend   │ ──────────────────────── ▶│  Node.js / Express   │
└─────────────────────┘                           │  backend (port 3000) │
                                                  │                      │
                                                  │  calls NER service   │
                                                  │  → stores tags in    │
                                                  │    Case.entities     │
                                                  └──────────┬───────────┘
                                                             │ POST /extract
                                                             ▼
                                                  ┌──────────────────────┐
                                                  │  FastAPI NER service │
                                                  │  (port 8001)         │
                                                  │  BioBERT + PubMedBERT│
                                                  └──────────────────────┘
```

**Workflow on case creation:**
1. Doctor submits case description via the frontend.
2. The Node.js backend calls `POST /extract` with the description text.
3. Returned entities are stored in a new `entities` field on the `Case` model.
4. Cases become searchable/filterable by symptom, disease, or medication.
5. A weekly cron job calls `/batch_extract` on all cases to refresh entity
   statistics for the disease-trend dashboard.

---

## License

MIT — same as the parent MedInternia project.