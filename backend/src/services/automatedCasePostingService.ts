type GeneratedCaseInput = {
  specialization?: string;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  symptoms?: string[];
  intervalDays?: number;
  focus?: string;
};

export type AutomatedCaseDraft = {
  title: string;
  description: string;
  symptoms: string[];
  patientInfo: {
    age: number;
    gender: 'male' | 'female' | 'other';
    medicalHistory: string[];
    currentMedications: string[];
  };
  diagnosis: string;
  treatment: string;
  tags: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  specialization: string;
  scheduledFor: Date;
  learningObjectives: string[];
  reviewChecklist: string[];
  anonymization: {
    patientIdentifiersRemoved: boolean;
    source: 'synthetic';
    notes: string[];
  };
};

type CaseTemplate = {
  specialization: string;
  title: string;
  baseSymptoms: string[];
  diagnosis: string;
  treatment: string;
  history: string[];
  medications: string[];
  objectives: string[];
};

const MIN_INTERVAL_DAYS = 1;
const MAX_INTERVAL_DAYS = 30;

const templates: CaseTemplate[] = [
  {
    specialization: 'Cardiology',
    title: 'AI Practice Case: Chest Pain Risk Stratification',
    baseSymptoms: [
      'chest discomfort',
      'shortness of breath',
      'sweating',
      'nausea',
    ],
    diagnosis:
      'Possible acute coronary syndrome requiring supervised risk stratification',
    treatment:
      'Discuss ECG review, troponin trend interpretation, aspirin eligibility, and escalation criteria.',
    history: [
      'hypertension',
      'family history of premature coronary artery disease',
    ],
    medications: ['amlodipine'],
    objectives: [
      'Identify time-sensitive cardiac red flags',
      'Differentiate stable chest discomfort from emergency presentations',
      'Practice building an initial investigation plan',
    ],
  },
  {
    specialization: 'Pulmonology',
    title: 'AI Practice Case: Progressive Breathlessness',
    baseSymptoms: [
      'productive cough',
      'fever',
      'shortness of breath',
      'pleuritic chest pain',
    ],
    diagnosis:
      'Community-acquired pneumonia versus viral lower respiratory infection',
    treatment:
      'Discuss oxygen assessment, chest imaging indications, hydration, and antimicrobial stewardship.',
    history: ['seasonal allergies'],
    medications: ['salbutamol inhaler as needed'],
    objectives: [
      'Recognize respiratory severity markers',
      'Prioritize oxygen saturation and respiratory rate',
      'Explain when imaging or urgent review is needed',
    ],
  },
  {
    specialization: 'Endocrinology',
    title: 'AI Practice Case: Hyperglycemia Follow-up',
    baseSymptoms: [
      'excessive thirst',
      'frequent urination',
      'fatigue',
      'blurred vision',
    ],
    diagnosis: 'Uncontrolled diabetes with dehydration risk',
    treatment:
      'Discuss glucose monitoring, ketone warning signs, hydration, and medication adherence review.',
    history: ['type 2 diabetes'],
    medications: ['metformin'],
    objectives: [
      'Screen for diabetic emergency warning signs',
      'Build a safe outpatient follow-up plan',
      'Explain medication adherence and hydration counseling',
    ],
  },
];

const reviewChecklist = [
  'Confirm the case is synthetic or fully anonymized before publishing',
  'Verify no names, phone numbers, addresses, dates of birth, or hospital IDs are present',
  'Confirm the learning objective is educational and not direct medical advice',
  'Review diagnosis and treatment text for clinician-supervised wording',
];

const normalizeText = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
};

const normalizeSymptoms = (symptoms: unknown): string[] => {
  if (!Array.isArray(symptoms)) return [];
  return symptoms
    .filter((symptom): symptom is string => typeof symptom === 'string')
    .map((symptom) => symptom.trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 8);
};

const clampIntervalDays = (intervalDays: unknown): number => {
  const parsedInterval =
    typeof intervalDays === 'string' && intervalDays.trim().length > 0
      ? Number(intervalDays)
      : intervalDays;

  if (typeof parsedInterval !== 'number' || !Number.isFinite(parsedInterval)) {
    return 1;
  }

  return Math.min(
    MAX_INTERVAL_DAYS,
    Math.max(MIN_INTERVAL_DAYS, Math.round(parsedInterval)),
  );
};

const selectTemplate = (specialization?: string): CaseTemplate => {
  const normalizedSpecialization = specialization?.toLowerCase();
  return (
    templates.find(
      (template) =>
        template.specialization.toLowerCase() === normalizedSpecialization,
    ) ?? templates[0]
  );
};

export const parseGeneratedCaseInput = (body: unknown): GeneratedCaseInput => {
  const payload =
    body && typeof body === 'object' ? (body as Record<string, unknown>) : {};
  const difficulty = payload.difficulty;

  return {
    specialization: normalizeText(payload.specialization),
    difficulty:
      difficulty === 'beginner' ||
      difficulty === 'intermediate' ||
      difficulty === 'advanced'
        ? difficulty
        : undefined,
    symptoms: normalizeSymptoms(payload.symptoms),
    intervalDays: clampIntervalDays(payload.intervalDays),
    focus: normalizeText(payload.focus),
  };
};

export const buildAutomatedCaseDraft = (
  input: GeneratedCaseInput,
): AutomatedCaseDraft => {
  const template = selectTemplate(input.specialization);
  const symptoms =
    input.symptoms && input.symptoms.length > 0
      ? input.symptoms
      : template.baseSymptoms;
  const intervalDays = clampIntervalDays(input.intervalDays);
  const scheduledFor = new Date(
    Date.now() + intervalDays * 24 * 60 * 60 * 1000,
  );
  const specialization = template.specialization;
  const difficulty = input.difficulty ?? 'intermediate';
  const focus = input.focus ? ` Focus area: ${input.focus}.` : '';

  return {
    title: template.title,
    description:
      `Synthetic teaching case generated for intern practice in ${specialization}. ` +
      `The learner should assess ${symptoms.join(', ')} while identifying red flags, safe next steps, and review needs.` +
      focus,
    symptoms,
    patientInfo: {
      age: difficulty === 'advanced' ? 67 : 42,
      gender: 'other',
      medicalHistory: template.history,
      currentMedications: template.medications,
    },
    diagnosis: template.diagnosis,
    treatment: template.treatment,
    tags: Array.from(
      new Set([
        'ai-generated',
        'practice-case',
        specialization.toLowerCase(),
        difficulty,
      ]),
    ),
    difficulty,
    specialization,
    scheduledFor,
    learningObjectives: template.objectives,
    reviewChecklist,
    anonymization: {
      patientIdentifiersRemoved: true,
      source: 'synthetic',
      notes: [
        'Uses deterministic synthetic data instead of real patient identifiers',
        'Avoids names, exact dates, addresses, IDs, and contact details',
        'Requires doctor review before becoming visible to learners',
      ],
    },
  };
};
