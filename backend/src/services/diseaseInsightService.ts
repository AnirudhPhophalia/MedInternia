type PatientContext = {
  age?: number;
  gender?: string;
  duration?: string;
  notes?: string;
};

type PredictionInput = PatientContext & {
  symptoms: string[];
};

type DiseaseProfile = {
  condition: string;
  specialty: string;
  symptoms: string[];
  redFlags: string[];
  afterEffects: string[];
  recommendations: string[];
};

export type DiseasePrediction = {
  condition: string;
  specialty: string;
  confidence: number;
  matchedSymptoms: string[];
  reasoning: string[];
  afterEffects: string[];
  recommendations: string[];
  redFlags: string[];
  urgent: boolean;
};

const diseaseProfiles: DiseaseProfile[] = [
  {
    condition: 'Acute viral upper respiratory infection',
    specialty: 'General Medicine',
    symptoms: ['fever', 'cough', 'sore throat', 'runny nose', 'fatigue', 'body ache', 'headache'],
    redFlags: ['shortness of breath', 'chest pain', 'confusion', 'persistent high fever'],
    afterEffects: ['post-viral fatigue', 'residual cough', 'dehydration risk'],
    recommendations: [
      'Monitor temperature and hydration status',
      'Consider symptomatic care and rest if no red flags are present',
      'Escalate for respiratory distress, persistent high fever, or worsening symptoms',
    ],
  },
  {
    condition: 'Community-acquired pneumonia',
    specialty: 'Pulmonology',
    symptoms: ['fever', 'productive cough', 'chest pain', 'shortness of breath', 'chills', 'rapid breathing'],
    redFlags: ['oxygen saturation low', 'shortness of breath', 'confusion', 'blue lips'],
    afterEffects: ['pleuritic pain', 'reduced exercise tolerance', 'secondary sepsis risk'],
    recommendations: [
      'Check oxygen saturation, respiratory rate, and chest findings',
      'Recommend clinician review for auscultation and chest imaging when indicated',
      'Urgent care is needed for hypoxia, confusion, or severe breathlessness',
    ],
  },
  {
    condition: 'Dengue-like febrile illness',
    specialty: 'Infectious Disease',
    symptoms: ['high fever', 'headache', 'retro orbital pain', 'joint pain', 'rash', 'nausea', 'bleeding'],
    redFlags: ['bleeding', 'severe abdominal pain', 'persistent vomiting', 'drowsiness'],
    afterEffects: ['thrombocytopenia', 'plasma leakage risk', 'post-febrile weakness'],
    recommendations: [
      'Track platelet count, hematocrit, hydration, and warning signs',
      'Avoid NSAIDs until dengue is excluded by a clinician',
      'Escalate urgently for bleeding, abdominal pain, vomiting, or altered sensorium',
    ],
  },
  {
    condition: 'Acute gastroenteritis',
    specialty: 'Gastroenterology',
    symptoms: ['diarrhea', 'vomiting', 'abdominal pain', 'fever', 'nausea', 'dehydration'],
    redFlags: ['blood in stool', 'severe dehydration', 'persistent vomiting', 'severe abdominal pain'],
    afterEffects: ['dehydration', 'electrolyte imbalance', 'temporary lactose intolerance'],
    recommendations: [
      'Assess hydration, urine output, stool frequency, and oral intake',
      'Prioritize oral rehydration when tolerated',
      'Escalate for blood in stool, severe dehydration, or persistent vomiting',
    ],
  },
  {
    condition: 'Urinary tract infection',
    specialty: 'Urology',
    symptoms: ['burning urination', 'frequent urination', 'lower abdominal pain', 'fever', 'flank pain', 'urgency'],
    redFlags: ['flank pain', 'high fever', 'pregnancy', 'vomiting'],
    afterEffects: ['ascending infection risk', 'pyelonephritis risk', 'recurrence risk'],
    recommendations: [
      'Check urine routine/microscopy and culture when clinically appropriate',
      'Assess fever, flank pain, pregnancy status, and recurrent episodes',
      'Urgent evaluation is needed for fever with flank pain or vomiting',
    ],
  },
  {
    condition: 'Migraine syndrome',
    specialty: 'Neurology',
    symptoms: ['headache', 'nausea', 'vomiting', 'light sensitivity', 'sound sensitivity', 'aura'],
    redFlags: ['sudden severe headache', 'weakness', 'seizure', 'confusion', 'fever with neck stiffness'],
    afterEffects: ['postdrome fatigue', 'recurrence risk', 'functional impairment'],
    recommendations: [
      'Document headache pattern, triggers, neurological symptoms, and medication use',
      'Recommend clinical assessment for recurrent or disabling headache',
      'Emergency evaluation is needed for thunderclap headache or neurological deficit',
    ],
  },
  {
    condition: 'Possible acute coronary syndrome',
    specialty: 'Cardiology',
    symptoms: ['chest pain', 'sweating', 'shortness of breath', 'left arm pain', 'jaw pain', 'nausea', 'palpitations'],
    redFlags: ['chest pain', 'sweating', 'shortness of breath', 'fainting'],
    afterEffects: ['arrhythmia risk', 'heart failure risk', 'myocardial injury risk'],
    recommendations: [
      'Treat chest pain with autonomic symptoms as time-sensitive',
      'Recommend ECG and urgent clinician evaluation',
      'Do not delay emergency care when chest pain is severe, persistent, or associated with dyspnea',
    ],
  },
  {
    condition: 'Uncontrolled diabetes / hyperglycemia',
    specialty: 'Endocrinology',
    symptoms: ['excessive thirst', 'frequent urination', 'weight loss', 'fatigue', 'blurred vision', 'slow wound healing'],
    redFlags: ['confusion', 'vomiting', 'deep breathing', 'severe dehydration'],
    afterEffects: ['dehydration', 'infection susceptibility', 'ketoacidosis risk'],
    recommendations: [
      'Check capillary glucose and hydration status',
      'Assess for infection, vomiting, abdominal pain, and altered sensorium',
      'Urgent evaluation is needed for suspected ketoacidosis or altered consciousness',
    ],
  },
];

const normalize = (value: string): string => value.trim().toLowerCase();

const tokenizeSymptoms = (symptoms: string[]): string[] => {
  return symptoms
    .flatMap((symptom) => symptom.split(','))
    .map(normalize)
    .filter(Boolean);
};

export const validatePredictionInput = (body: unknown): PredictionInput => {
  if (!body || typeof body !== 'object') {
    throw new Error('Request body is required');
  }

  const payload = body as Record<string, unknown>;
  const rawSymptoms = payload.symptoms;

  let symptoms: string[] = [];
  if (Array.isArray(rawSymptoms)) {
    symptoms = rawSymptoms.filter((item): item is string => typeof item === 'string');
  } else if (typeof rawSymptoms === 'string') {
    symptoms = rawSymptoms.split(',');
  }

  symptoms = tokenizeSymptoms(symptoms);

  if (symptoms.length === 0) {
    throw new Error('At least one symptom is required');
  }

  if (symptoms.some((symptom) => symptom.length > 80)) {
    throw new Error('Each symptom must be 80 characters or fewer');
  }

  let age: number | undefined;
  if (payload.age !== undefined) {
    if (typeof payload.age !== 'number' || !Number.isFinite(payload.age)) {
      throw new Error('Age must be a finite number');
    }

    age = payload.age;
  }

  if (age !== undefined && (age < 0 || age > 120)) {
    throw new Error('Age must be between 0 and 120');
  }

  return {
    symptoms,
    age,
    gender: typeof payload.gender === 'string' ? payload.gender.trim() : undefined,
    duration: typeof payload.duration === 'string' ? payload.duration.trim() : undefined,
    notes: typeof payload.notes === 'string' ? payload.notes.trim() : undefined,
  };
};

const symptomMatches = (reportedSymptoms: string[], profileSymptom: string): string[] => {
  const normalizedProfileSymptom = normalize(profileSymptom);
  return reportedSymptoms.filter(
    (symptom) =>
      symptom === normalizedProfileSymptom ||
      symptom.includes(normalizedProfileSymptom) ||
      normalizedProfileSymptom.includes(symptom)
  );
};

export const predictDiseaseInsights = (input: PredictionInput): DiseasePrediction[] => {
  const reportedSymptoms = tokenizeSymptoms(input.symptoms);

  return diseaseProfiles
    .map((profile) => {
      const matchedSymptoms = Array.from(
        new Set(profile.symptoms.flatMap((symptom) => symptomMatches(reportedSymptoms, symptom)))
      );
      const redFlags = profile.redFlags.filter((flag) => symptomMatches(reportedSymptoms, flag).length > 0);
      const confidence = Math.min(
        0.95,
        Math.round((matchedSymptoms.length / Math.max(profile.symptoms.length, 1)) * 100) / 100
      );

      return {
        condition: profile.condition,
        specialty: profile.specialty,
        confidence,
        matchedSymptoms,
        reasoning: [
          `${matchedSymptoms.length} symptom signal(s) matched this profile.`,
          input.duration ? `Reported duration: ${input.duration}.` : 'Duration was not provided.',
          redFlags.length > 0
            ? `Red flag signal(s) detected: ${redFlags.join(', ')}.`
            : 'No profile-specific red flags were detected from the submitted symptoms.',
        ],
        afterEffects: profile.afterEffects,
        recommendations: profile.recommendations,
        redFlags,
        urgent: redFlags.length > 0,
      };
    })
    .filter((prediction) => prediction.confidence > 0)
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 5);
};
