// Heuristic clinical-case complexity scoring.
//
// Turns a case's already-stored fields (symptoms, comorbidities, medications,
// patient age, rare-disease flag, attachments) into a 0-100 complexity score
// and a suggested difficulty tier. Pure and deterministic — no I/O — so it is
// unit-testable with plain objects and gives the manually-authored `difficulty`
// field a computed counterpart.

export interface CaseComplexityInput {
  symptoms?: string[];
  patientInfo?: {
    age?: number;
    medicalHistory?: string[];
    currentMedications?: string[];
  };
  attachments?: { url: string }[];
  isRareDisease?: boolean;
}

export interface CaseComplexityFactors {
  symptoms: number;
  comorbidities: number;
  medications: number;
  ageRisk: number;
  rareDisease: number;
  attachments: number;
}

export interface CaseComplexityResult {
  score: number;
  suggestedDifficulty: "beginner" | "intermediate" | "advanced";
  factors: CaseComplexityFactors;
}

const len = (value: unknown): number => (Array.isArray(value) ? value.length : 0);

const ageRiskPoints = (age?: number): number => {
  if (typeof age !== "number" || Number.isNaN(age)) return 0;
  if (age < 2) return 12;
  if (age >= 70) return 10;
  if (age >= 50) return 5;
  return 0;
};

/**
 * Score a clinical case's complexity from its stored fields.
 * @param input - a plain case object (missing fields treated as empty)
 * @returns score (0-100), a suggested difficulty tier, and the factor breakdown
 */
export function scoreCaseComplexity(
  input: CaseComplexityInput,
): CaseComplexityResult {
  const safe = input ?? {};
  const patient = safe.patientInfo ?? {};

  const factors: CaseComplexityFactors = {
    symptoms: Math.min(len(safe.symptoms), 8) * 6,
    comorbidities: Math.min(len(patient.medicalHistory), 6) * 5,
    medications: Math.min(len(patient.currentMedications), 6) * 4,
    ageRisk: ageRiskPoints(patient.age),
    rareDisease: safe.isRareDisease ? 15 : 0,
    attachments: Math.min(len(safe.attachments), 4) * 3,
  };

  const sum = Object.values(factors).reduce((total, n) => total + n, 0);
  const score = Math.max(0, Math.min(100, Math.round(sum)));

  const suggestedDifficulty =
    score < 30 ? "beginner" : score < 60 ? "intermediate" : "advanced";

  return { score, suggestedDifficulty, factors };
}
