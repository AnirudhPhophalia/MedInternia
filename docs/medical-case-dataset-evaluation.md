# Medical Case Dataset Evaluation for AI Training

This note evaluates public medical datasets that could support MedInternia's
case-based learning and AI-assisted case analysis features. The goal is not to
commit raw medical data into this repository. Instead, it gives maintainers a
safe shortlist, field mapping, licensing notes, and a normalized schema that can
guide a future ingestion pipeline.

## Selection Criteria

The dataset should help MedInternia generate, retrieve, or evaluate clinical
case discussions while respecting privacy and licensing boundaries.

- Publicly documented source with clear access instructions
- No direct personally identifiable information in the project repository
- Structured or semi-structured medical reasoning content
- Useful fields for symptoms, diagnosis, differential diagnosis, treatment, and
  specialty tagging
- Practical for model evaluation before any heavier training pipeline
- License or data-use terms that can be documented before ingestion

## Recommended Shortlist

| Dataset | Best Use | Access / License Notes | Fit for MedInternia |
| --- | --- | --- | --- |
| PubMedQA | Evidence-grounded biomedical question answering and evaluation | Public research dataset; the commonly used annotated benchmark is distributed with an MIT-style license in several dataset hubs. Verify the exact mirror before use. | Good first evaluation set for medical reasoning because each item has a research question, context, and yes/no/maybe answer. It is less like a bedside case, so it should be used for AI answer grounding rather than case creation. |
| MedMCQA | Multi-specialty medical exam reasoning | Public benchmark described in the MedMCQA paper and mirrored on Hugging Face. Confirm the selected mirror license before redistribution. | Strong for specialty classification and multiple-choice reasoning. It has explanations in many records, but it is exam-oriented rather than patient-case-oriented. |
| MedQA / USMLE-style datasets | Clinical vignette reasoning | Multiple mirrors exist; license clarity varies by mirror. Use only a mirror with explicit reuse terms. | Useful for case-vignette evaluation because many prompts include age, symptoms, history, and answer choices. Not ideal for direct training unless licensing is reviewed. |
| MIMIC-IV / MIMIC-IV-Note | Real clinical EHR events and notes | Requires PhysioNet credentialing, CITI training, and a signed data-use agreement. Do not commit raw rows or derived patient text to the repo. | Highest clinical realism, but access restrictions make it unsuitable for open repo samples. Best for a future private research pipeline or synthetic aggregate statistics after compliance review. |
| Synthetic MedInternia seed cases | Demo, UI testing, and safe local development | Project-owned content can be MIT-compatible if authored from scratch. Avoid copying protected clinical notes. | Best immediate option for repository fixtures because it avoids licensing and privacy risk while matching the product schema exactly. |

## Field Mapping

| MedInternia Need | PubMedQA | MedMCQA | MedQA / USMLE | MIMIC-IV | Synthetic Seed Cases |
| --- | --- | --- | --- | --- | --- |
| Clinical presentation | Partial: research question and abstract context | Partial: exam stem | Strong: vignette-style stems | Strong: real notes and events | Strong if authored deliberately |
| Symptoms | Often implicit | Often present in stems | Often present | Present but may require extraction | Explicit |
| Diagnosis | Usually not a diagnosis label | Often represented by correct option | Often represented by correct option | Requires mapping from ICD / notes | Explicit |
| Differential diagnosis | Limited | Answer options can act as candidates | Answer options can act as candidates | Requires clinical modeling | Explicit |
| Treatment / intervention | Sometimes in abstract context | Sometimes in explanation | Sometimes in stem/explanation | Strong but compliance-restricted | Explicit |
| Outcome / follow-up | Sometimes in abstract context | Limited | Limited | Strong but compliance-restricted | Explicit |
| Specialty | Needs classifier or metadata mapping | Often inferable from subject | Often inferable | Can be mapped from services / ICD | Explicit |
| Licensing clarity | Good when using documented benchmark mirrors | Mirror-dependent | Mirror-dependent | Clear but restricted | Project-controlled |

## Recommended Data Strategy

1. Start with synthetic MedInternia seed cases for UI, retrieval, and pipeline
   tests. This avoids privacy risk and lets the project shape the exact schema.
2. Use PubMedQA and MedMCQA as external evaluation benchmarks for medical
   reasoning quality, not as direct case-discussion fixtures.
3. Add MedQA-style vignette data only after selecting a mirror with explicit
   reuse terms.
4. Treat MIMIC-IV as a future compliance-gated research path. It should not be
   part of the open repository unless only schema documentation or fully
   non-identifying aggregate examples are included.

## Proposed Normalized Schema

```json
{
  "case_id": "case_seed_001",
  "source": {
    "name": "MedInternia Synthetic Seed",
    "url": "https://github.com/AnirudhPhophalia/MedInternia",
    "license": "MIT-compatible project-authored content",
    "access_notes": "No patient data. Authored for demo and testing."
  },
  "specialty": "Internal Medicine",
  "difficulty": "beginner",
  "severity": "moderate",
  "clinical_presentation": "A 42-year-old patient reports fatigue, increased thirst, and frequent urination for three months.",
  "symptoms": ["fatigue", "polydipsia", "polyuria"],
  "diagnosis": "Type 2 diabetes mellitus",
  "differential_diagnosis": [
    "diabetes insipidus",
    "hyperthyroidism",
    "chronic kidney disease"
  ],
  "recommended_workup": [
    "fasting plasma glucose",
    "HbA1c",
    "urinalysis",
    "basic metabolic panel"
  ],
  "treatment_or_intervention": "Lifestyle counseling, metformin consideration, and follow-up glucose monitoring.",
  "outcome_or_follow_up": "Follow-up in 4 weeks to review labs and adjust care plan.",
  "teaching_points": [
    "Match symptoms with diagnostic testing before treatment escalation.",
    "Document differential diagnosis for peer discussion."
  ],
  "safety_notes": [
    "Educational use only.",
    "Not a substitute for clinical judgment."
  ]
}
```

## Minimal Seed Dataset Preview

| case_id | specialty | presentation | diagnosis | missing_fields |
| --- | --- | --- | --- | --- |
| case_seed_001 | Internal Medicine | Fatigue, thirst, and frequent urination | Type 2 diabetes mellitus | None |
| case_seed_002 | Pediatrics | Fever, sore throat, and sandpaper-like rash | Scarlet fever | Outcome follow-up optional |
| case_seed_003 | Emergency Medicine | Sudden chest pain radiating to left arm | Acute coronary syndrome rule-out | Final diagnosis depends on troponin/ECG |

These rows are intentionally synthetic. They are safe for development fixtures
but should stay clearly labeled as educational examples.

## Preprocessing Plan

- Store dataset source metadata beside every imported case.
- Normalize text fields into plain UTF-8 strings.
- Keep symptoms, differential diagnosis, workup, and teaching points as arrays.
- Add a `source.license` value before accepting a record into training data.
- Reject records with direct identifiers such as name, phone, full address,
  email, exact dates tied to a patient, or medical record numbers.
- Keep raw restricted datasets outside the public repository.

## Suitability Recommendation

For the next implementation step, MedInternia should add a small synthetic seed
dataset plus an ingestion interface that can later accept PubMedQA, MedMCQA, or
credentialed MIMIC-derived records after licensing review. This gives the AI
pipeline immediate structure without creating privacy or redistribution risk.

The highest-confidence open workflow is:

1. Create `case_dataset.schema.json` from the normalized schema above.
2. Add 5 to 10 synthetic seed cases under a clearly marked demo fixture path.
3. Add a dataset source registry file with license/access notes.
4. Build a later importer for external benchmarks only after the maintainers
   approve the selected dataset mirror and license.

## References

- PubMedQA paper: https://arxiv.org/abs/1909.06146
- MedMCQA paper: https://arxiv.org/abs/2203.14371
- MIMIC access guide: https://mimic.mit.edu/docs/faq/how-to-get-access.html
- MIMIC-IV documentation: https://mimic.mit.edu/docs/IV/
