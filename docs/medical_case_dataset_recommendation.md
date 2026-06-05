# Medical Case Dataset Recommendation

This report evaluates practical dataset options for MedInternia's AI-assisted case learning workflow. The goal is to identify legally usable sources, map available fields to the existing `Case` model, and document limitations before any training or ingestion work begins.

## Recommendation Summary

Use a two-tier dataset strategy:

1. **Primary case corpus:** Build a filtered case-report corpus from the **PubMed Central Open Access Subset**.
2. **Evaluation and QA augmentation:** Use **PubMedQA** for biomedical question-answer evaluation and optionally evaluate **MedQuAD** only after maintainers confirm redistribution/licensing terms.

Avoid using restricted clinical datasets such as MIMIC for repository-bundled training data unless the project adds a separate credentialed-access workflow. Those datasets can be excellent for research, but they are not suitable for direct redistribution in this repository.

## MedInternia Case Schema Fit

Current backend case fields from `backend/src/models/Case.ts`:

| MedInternia field | Needed for AI training | Dataset mapping notes |
|---|---:|---|
| `title` | Required | Use article title or generated concise case title. |
| `description` | Required | Use case presentation, case report body, or extracted abstract section. |
| `symptoms` | Required | Extract from presentation text with clinical NLP or manual review. |
| `patientInfo.age` | Useful | Usually available in case reports, but must be parsed and normalized. |
| `patientInfo.gender` | Useful | Usually available in case reports, but may be missing or ambiguous. |
| `patientInfo.medicalHistory` | Useful | Often present in narrative form. |
| `patientInfo.currentMedications` | Optional | Present in some reports only. |
| `diagnosis` | Required | Often present in title, diagnosis, discussion, or conclusion sections. |
| `treatment` | Useful | Often present as intervention, treatment, management, or therapy text. |
| `followUps.outcome` | Useful | Frequently present as outcome or follow-up, but not always structured. |
| `specialization` | Required | Infer from MeSH terms, journal category, article topic, or diagnosis group. |
| `difficulty` | Required | Can be derived later from rarity, complexity, or number of differential diagnoses. |
| `tags` | Useful | Use disease names, specialty, symptoms, and article keywords. |

## Candidate Dataset Review

### 1. PubMed Central Open Access Subset

- Source: https://www.ncbi.nlm.nih.gov/pmc/tools/openftlist/
- Type: Full-text biomedical articles, including many case reports.
- Best use: Primary source for case-like training examples.
- License status: Article-level licenses vary. The ingestion workflow must keep only articles with licenses approved by maintainers, such as CC BY or CC0, and must preserve source attribution.
- PHI risk: Low for published open-access articles, but still run a de-identification screen before using generated examples.
- Strengths:
  - Rich case narratives with presentation, diagnosis, treatment, and outcomes.
  - Strong source provenance through PMCID, DOI, journal, and publication metadata.
  - Can be filtered for article type or title keywords such as "case report".
- Limitations:
  - Text is semi-structured, so extraction requires preprocessing.
  - Licensing is not uniform across the full open-access subset.
  - Some case reports omit structured symptoms or follow-up fields.

Recommended extracted schema:

```json
{
  "source": "PMC Open Access Subset",
  "source_id": "PMCID",
  "source_url": "https://pmc.ncbi.nlm.nih.gov/articles/PMCID/",
  "license": "article-level license",
  "title": "case title",
  "description": "clinical presentation summary",
  "symptoms": ["symptom"],
  "patientInfo": {
    "age": null,
    "gender": "other",
    "medicalHistory": [],
    "currentMedications": []
  },
  "diagnosis": "diagnosis text",
  "differentialDiagnosis": [],
  "treatment": "management or intervention text",
  "outcome": "follow-up or recovery details",
  "specialization": "medical specialty",
  "tags": ["case-report", "specialty", "diagnosis"],
  "qualityFlags": {
    "licenseReviewed": true,
    "deidentified": true,
    "manualReviewNeeded": true
  }
}
```

### 2. PubMedQA

- Source: https://github.com/pubmedqa/pubmedqa
- Type: Biomedical question-answering dataset built from PubMed abstracts.
- License status: Repository license is MIT.
- Best use: Evaluation set for medical QA and reasoning, not the primary MedInternia case corpus.
- Strengths:
  - Useful for testing whether AI answers are evidence-aware.
  - Structured question/context/answer format.
  - Permissive repository license.
- Limitations:
  - Not a clinical case report dataset.
  - Usually lacks patient-level treatment and follow-up fields.
  - Better for evaluation than for generating MedInternia `Case` records.

Recommended use:

```json
{
  "task": "medical_qa_evaluation",
  "question": "PubMedQA question",
  "context": "abstract context",
  "answer": "yes/no/maybe or long answer",
  "source": "PubMedQA"
}
```

### 3. MedQuAD

- Source: https://github.com/abachaa/MedQuAD
- Type: Medical question-answer pairs from NIH and related sources.
- License status: Verify before redistribution. A simple license file was not available at the checked repository path.
- Best use: Supplemental patient-education QA after license review.
- Strengths:
  - Broad medical topics and patient-friendly explanations.
  - Useful for educational chatbot responses or FAQ augmentation.
- Limitations:
  - Not structured as clinical case reports.
  - Does not naturally map to symptoms, diagnosis, treatment, and follow-up fields.
  - License and redistribution requirements must be confirmed before bundling derived data.

### 4. MIMIC-Style Clinical Datasets

- Source examples: PhysioNet credentialed datasets.
- Type: Real clinical records.
- Best use: Future private research experiments, not repository-bundled training data.
- Strengths:
  - High clinical realism.
  - Structured hospital data can support serious research.
- Limitations:
  - Requires credentialing, training, and data-use agreements.
  - Not appropriate for open redistribution in this repository.
  - Higher compliance and privacy burden than open-access literature.

## Suggested Preprocessing Pipeline

1. Query trusted sources for case reports and metadata.
2. Keep only records with approved licenses and source URLs.
3. Extract title, abstract, case presentation, diagnosis, treatment, and outcome sections.
4. Normalize fields into the MedInternia case schema.
5. Run a de-identification check for names, dates, exact locations, contact details, and record numbers.
6. Add `qualityFlags` for license review, de-identification, and manual review status.
7. Store a small reviewed sample first, then scale ingestion after maintainers approve the schema.

## Minimum Viable Dataset Preview

The first usable dataset artifact can be a JSONL file with one normalized case per line:

```json
{"source":"PMC Open Access Subset","source_id":"PMC_SAMPLE","license":"CC BY","title":"Example case title","description":"Short clinical presentation.","symptoms":["fever","cough"],"patientInfo":{"age":42,"gender":"female","medicalHistory":[],"currentMedications":[]},"diagnosis":"Example diagnosis","differentialDiagnosis":["Alternative diagnosis"],"treatment":"Example treatment plan","outcome":"Recovered after follow-up.","specialization":"Internal Medicine","tags":["case-report","internal-medicine"],"qualityFlags":{"licenseReviewed":true,"deidentified":true,"manualReviewNeeded":true}}
```

Do not commit large generated datasets until maintainers approve storage location, file size limits, and license policy.

## Final Recommendation

Start with **PMC Open Access case reports** and build a small, manually reviewed JSONL sample. Use **PubMedQA** for QA evaluation benchmarks. Treat **MedQuAD** as optional until license terms are confirmed. Do not redistribute credentialed EHR datasets such as MIMIC through this repository.

This approach gives MedInternia a legally safer path toward AI case-learning data while preserving enough structure for future diagnosis, treatment, specialty, and follow-up experiments.
