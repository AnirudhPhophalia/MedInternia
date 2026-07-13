# NLP Entity Extraction Pipeline Produces Incorrect Results Due to Substring Matching and Wrong Aggregation Strategy

## Description

The Biomedical NER microservice (`nlp/app/main.py`) has two critical bugs that cause incorrect entity extraction: the `_canonical_label` function uses overly broad substring matching that produces false-positive entity classifications, and the HuggingFace pipeline uses `aggregation_strategy="first"` (instead of `"simple"`) which truncates entity text to incomplete subword tokens.

## Bug 1: `_canonical_label` Substring Matching Causes False Positives

**File:** `nlp/app/main.py`, lines 198–206

The function classifies raw NER labels into `DISEASE`, `SYMPTOM`, or `MEDICATION` using `in` (substring) checks:

```python
def _canonical_label(raw: str) -> str | None:
    upper = raw.upper()
    if upper in DISEASE_TAGS or "DISEASE" in upper or "DIS" == upper:
        return "DISEASE"
    if upper in SYMPTOM_TAGS or "SYMPTOM" in upper or "SIGN" in upper:
        return "SYMPTOM"
    if upper in MEDICATION_TAGS or "CHEMICAL" in upper or "DRUG" in upper:
        return "MEDICATION"
    return None
```

**Problems:**

1. `"DISEASE" in upper` — matches any label containing "disease" as a substring, e.g., `"NON_DISEASE"`, `"DISEASE_OUTBREAK"`, `"DISEASE_AREA"`, or any tag where "disease" appears incidentally.

2. `"SYMPTOM" in upper` — matches `"ASYMPTOMATIC"`, `"PRESYMPTOMATIC"`, `"SYMPTOMATOLOGY"`, etc.

3. `"SIGN" in upper` — extremely broad; matches `"DESIGN"`, `"ASSIGNMENT"`, `"SIGNAL"`, `"SIGNATURE"`, `"CONSIGN"`, `"SIGNING"`.

4. `"CHEMICAL" in upper` — matches non-medical chemical references.

5. `"DRUG" in upper"` — matches `"DRUG_STORE"`, `"DRUG_TRIAL"`, `"PRODRUG"`, etc.

**Impact:** If a model fine-tuned on a different ontology produces an unexpected label containing any of these substrings, it will be **silently misclassified** as a medical entity with no indication of error.

## Bug 2: `aggregation_strategy="first"` Truncates Entity Text

**File:** `nlp/app/main.py`, lines 106–120

```python
def _load_disease():
    return pipeline(
        "ner",
        model=DISEASE_MODEL,
        aggregation_strategy="first",   # <-- BUG: should be "simple"
        device=device,
    )
```

The `"first"` strategy only keeps the **first subword token** of each word. For example:

- `"Metformin"` tokenized as `["Met", "##form", "##in"]` → entity text becomes `"Met"` instead of `"Metformin"`
- `"Streptococcus"` tokenized as `["Strept", "##ococcus"]` → entity text becomes `"Strept"` instead of `"Streptococcus"`

**Contradictory evidence:**
- Line 226's comment says: `# Clean subword artefacts (##token) — shouldn't appear with aggregation_strategy="simple" but guard anyway.`
- The README at line 38 also says the code uses `aggregation_strategy="simple"`.
- But the actual code uses `"first"` on both lines **110** and **118**.

The regex workaround on line 227 (`re.sub(r"\s*##\S+", "", word)`) is an incomplete band-aid that tries to strip subword artefacts, but it cannot reconstruct the original word because the first subword token is often a fragment, not the complete word.

## Bug 3: Batch Endpoint Can Exhaust Thread Pool

**File:** `nlp/app/main.py`, lines 331–333

```python
results = await asyncio.gather(
    *[loop.run_in_executor(None, _run_ner_sync, r.text) for r in requests]
)
```

All 20 batch items are dispatched concurrently to the **default `ThreadPoolExecutor`** (`max_workers` = min(32, cpu_count + 4) ≈ 12 on 8-core machines). Each worker runs two full BERT-size transformer inferences. This causes:

- Thread contention and excessive context switching
- Potential CUDA OOM errors from too many concurrent GPU inferences
- Degraded throughput for all concurrent requests

## Bug 4: No Timeout on Model Inference

**File:** `nlp/app/main.py`, lines 256–257

```python
def _run_ner_sync(text: str) -> list[EntityItem]:
    ...
    disease_raw = _disease_pipeline(text)
    general_raw = _general_pipeline(text)
```

If a model hangs (CUDA driver issue, infinite loop in custom ops, OOM stall), the request hangs **indefinitely**. There is no `asyncio.wait_for()` wrapper around the executor call on line 293.

## Bug 5: CORS Origin Whitespace Not Trimmed

**File:** `nlp/app/main.py`, line 148

```python
allow_origins=os.getenv("CORS_ORIGINS", "http://localhost:3000").split(","),
```

If `CORS_ORIGINS` is set to `http://example.com, http://other.com` (with spaces after commas), `str.split(",")` produces `["http://example.com", " http://other.com"]`. Browsers won't match the space-prefixed origin, causing silent CORS failures.

## Bug 6: `assert` Removed Under Python `-O` Optimization

**File:** `nlp/app/main.py`, lines 253–254

```python
def _run_ner_sync(text: str) -> list[EntityItem]:
    assert _disease_pipeline is not None
    assert _general_pipeline is not None
```

Python removes `assert` statements when running with `-O` (optimized mode). If deployed in production with optimization, these guards vanish and pipelines may crash with uninformative `AttributeError` instead of clear error messages.

## Tasks

1. **`nlp/app/main.py`:**
   - Replace substring matching in `_canonical_label` (line 200, 202, 204) with exact matching or regex word-boundary checks (`\bDISEASE\b`)
   - Change `aggregation_strategy` from `"first"` to `"simple"` on lines 110 and 118
   - Remove the subword cleanup regex on line 227 (no longer needed)
   - Add `asyncio.Semaphore` (e.g., `asyncio.Semaphore(4)`) to limit concurrent inferences in the batch endpoint
   - Wrap executor call with `asyncio.wait_for(..., timeout=30.0)` on line 293
   - Replace `assert` with proper `if pipeline is None: raise RuntimeError(...)` on lines 253–254
   - Fix CORS origin splitting to strip whitespace: `[o.strip() for o in os.getenv(...).split(",")]`

2. **`nlp/tests/test_ner_service.py`:**
   - Add test cases for `_canonical_label` with edge cases like `"NON_DISEASE"`, `"ASYMPTOMATIC"`, `"DESIGN"`, `"PRODRUG"` to ensure they are **not** classified
   - Add tests for the batch endpoint with mixed valid/invalid items
   - Add test for the global exception handler

3. **`requirements.txt`:**
   - Fix non-standard `==0.111.*` wildcard version specifiers to proper range syntax (e.g., `>=0.111.0,<0.112.0`)
