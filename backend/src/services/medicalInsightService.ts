import Case from "../models/Case";

export type PatientContext = {
  age?: number;
  gender?: string;
  medicalHistory?: string[];
  currentMedications?: string[];
};

export type PredictionInput = {
  symptoms: string[];
  patientContext?: PatientContext;
  notes?: string;
};

export type DiseasePrediction = {
  condition: string;
  confidence: number;
  matchedSignals: string[];
  rationale: string;
  afterEffects: string[];
  recommendations: string[];
  urgency: "routine" | "soon" | "urgent";
};

type KnowledgeRule = {
  condition: string;
  symptoms: string[];
  riskFactors: string[];
  rationale: string;
  afterEffects: string[];
  recommendations: string[];
  urgency: DiseasePrediction["urgency"];
};

const knowledgeBase: KnowledgeRule[] = [
  {
    condition: "Diabetic ketoacidosis",
    symptoms: [
      "fruity breath",
      "rapid breathing",
      "vomiting",
      "dehydration",
      "altered mental status",
      "abdominal pain",
    ],
    riskFactors: ["diabetes", "missed insulin", "infection"],
    rationale:
      "Ketone-related breath changes, dehydration, vomiting, and altered sensorium are high-yield DKA signals.",
    afterEffects: [
      "Electrolyte imbalance",
      "Cerebral edema risk during treatment",
      "Acute kidney injury from dehydration",
    ],
    recommendations: [
      "Check capillary glucose and serum/urine ketones",
      "Order ABG/VBG and electrolytes",
      "Escalate for supervised insulin and fluid protocol",
    ],
    urgency: "urgent",
  },
  {
    condition: "Acute coronary syndrome",
    symptoms: [
      "chest pain",
      "chest pressure",
      "sweating",
      "shortness of breath",
      "left arm pain",
      "jaw pain",
      "nausea",
    ],
    riskFactors: [
      "diabetes",
      "hypertension",
      "smoking",
      "hyperlipidemia",
      "previous mi",
    ],
    rationale:
      "Pressure-like chest symptoms with autonomic features and dyspnea should be treated as cardiac until excluded.",
    afterEffects: ["Arrhythmia", "Heart failure", "Cardiogenic shock"],
    recommendations: [
      "Get ECG within 10 minutes",
      "Check troponin trend",
      "Escalate to emergency/cardiology pathway",
    ],
    urgency: "urgent",
  },
  {
    condition: "Community-acquired pneumonia",
    symptoms: [
      "fever",
      "cough",
      "productive cough",
      "shortness of breath",
      "pleuritic pain",
      "fatigue",
      "chills",
    ],
    riskFactors: ["copd", "asthma", "elderly", "immunosuppression"],
    rationale:
      "Fever, cough, dyspnea, and pleuritic symptoms point toward lower respiratory infection.",
    afterEffects: ["Hypoxia", "Pleural effusion", "Sepsis in severe cases"],
    recommendations: [
      "Record oxygen saturation and respiratory rate",
      "Consider chest imaging",
      "Assess severity and need for antibiotics per local protocol",
    ],
    urgency: "soon",
  },
  {
    condition: "Meningitis",
    symptoms: [
      "fever",
      "neck stiffness",
      "headache",
      "photophobia",
      "confusion",
      "vomiting",
      "rash",
    ],
    riskFactors: ["immunosuppression", "recent infection"],
    rationale:
      "Fever with meningeal irritation or altered mental status is a red-flag neurologic pattern.",
    afterEffects: ["Seizures", "Hearing loss", "Neurologic deficit", "Sepsis"],
    recommendations: [
      "Escalate immediately for senior review",
      "Assess airway, breathing, circulation and mental status",
      "Prepare urgent labs/imaging/LP pathway as clinically appropriate",
    ],
    urgency: "urgent",
  },
  {
    condition: "Asthma or COPD exacerbation",
    symptoms: [
      "wheezing",
      "shortness of breath",
      "cough",
      "chest tightness",
      "tachypnea",
      "difficulty speaking",
    ],
    riskFactors: ["asthma", "copd", "smoking", "allergy"],
    rationale:
      "Wheeze, chest tightness, and dyspnea are consistent with obstructive airway exacerbation.",
    afterEffects: [
      "Respiratory fatigue",
      "Hypoxia",
      "Hypercapnia in severe obstruction",
    ],
    recommendations: [
      "Check oxygen saturation and peak flow if available",
      "Assess ability to speak full sentences",
      "Follow bronchodilator and steroid protocol under supervision",
    ],
    urgency: "soon",
  },
  {
    condition: "Migraine",
    symptoms: [
      "headache",
      "throbbing pain",
      "nausea",
      "photophobia",
      "phonophobia",
      "aura",
      "vomiting",
    ],
    riskFactors: ["migraine history", "sleep deprivation", "stress"],
    rationale:
      "Throbbing headache with nausea and light/sound sensitivity supports migraine when red flags are absent.",
    afterEffects: [
      "Postdrome fatigue",
      "Medication-overuse headache",
      "Functional impairment",
    ],
    recommendations: [
      "Screen for sudden onset, neurologic deficit, fever, or trauma",
      "Assess hydration and trigger history",
      "Consider guideline-based analgesia/antiemetic plan",
    ],
    urgency: "routine",
  },
  {
    condition: "Urinary tract infection",
    symptoms: [
      "burning urination",
      "dysuria",
      "frequency",
      "urgency",
      "suprapubic pain",
      "fever",
      "flank pain",
    ],
    riskFactors: ["pregnancy", "diabetes", "recurrent uti"],
    rationale:
      "Lower urinary symptoms suggest UTI, while fever or flank pain raises concern for upper tract involvement.",
    afterEffects: [
      "Pyelonephritis",
      "Sepsis in high-risk patients",
      "Recurrent infection",
    ],
    recommendations: [
      "Check urinalysis and culture when indicated",
      "Ask about pregnancy and flank pain",
      "Escalate fever/flank pain or systemic features",
    ],
    urgency: "soon",
  },
  {
    condition: "Acute gastroenteritis",
    symptoms: [
      "diarrhea",
      "vomiting",
      "abdominal pain",
      "fever",
      "dehydration",
      "nausea",
    ],
    riskFactors: ["recent travel", "unsafe food", "immunosuppression"],
    rationale:
      "Vomiting, diarrhea, abdominal cramps, and dehydration fit an infectious or toxin-mediated GI illness pattern.",
    afterEffects: [
      "Dehydration",
      "Electrolyte imbalance",
      "Acute kidney injury in severe volume loss",
    ],
    recommendations: [
      "Assess hydration and urine output",
      "Review blood in stool, persistent fever, or severe pain",
      "Prioritize oral/IV rehydration based on severity",
    ],
    urgency: "routine",
  },
];

const redFlagSignals = [
  "chest pain",
  "altered mental status",
  "confusion",
  "severe shortness of breath",
  "difficulty speaking",
  "neck stiffness",
  "seizure",
  "syncope",
  "blood in stool",
  "severe dehydration",
];

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function includesSignal(text: string, signal: string): boolean {
  return text.includes(signal) || signal.includes(text);
}

function scoreSignals(inputs: string[], targets: string[]): string[] {
  return targets.filter((target) =>
    inputs.some(
      (input) => includesSignal(input, target) || includesSignal(target, input),
    ),
  );
}

function buildInputSignals(input: PredictionInput): string[] {
  const context = input.patientContext;
  const values = [
    ...input.symptoms,
    ...(context?.medicalHistory ?? []),
    ...(context?.currentMedications ?? []),
    input.notes ?? "",
  ];

  return values.map(normalize).filter(Boolean);
}

async function getCaseOutcomeBoost(inputSignals: string[]) {
  const cases = await Case.find({
    isActive: true,
    diagnosis: { $exists: true, $ne: "" },
  })
    .select("title symptoms tags diagnosis specialization difficulty")
    .limit(80)
    .lean();

  return cases
    .map((caseItem) => {
      const caseSignals = [
        ...(caseItem.symptoms ?? []),
        ...(caseItem.tags ?? []),
        caseItem.title ?? "",
        caseItem.specialization ?? "",
      ].map(normalize);
      const matches = scoreSignals(inputSignals, caseSignals);

      return {
        diagnosis: String(caseItem.diagnosis),
        matches,
        boost: Math.min(matches.length * 0.08, 0.24),
      };
    })
    .filter((item) => item.matches.length > 0)
    .sort((a, b) => b.boost - a.boost)
    .slice(0, 3);
}

function buildPrediction(
  rule: KnowledgeRule,
  inputSignals: string[],
  boost = 0,
): DiseasePrediction | null {
  const symptomMatches = scoreSignals(inputSignals, rule.symptoms);
  const riskMatches = scoreSignals(inputSignals, rule.riskFactors);
  const rawScore =
    symptomMatches.length * 0.16 + riskMatches.length * 0.08 + boost;

  if (symptomMatches.length === 0 && rawScore < 0.2) {
    return null;
  }

  return {
    condition: rule.condition,
    confidence: Math.min(Math.round((0.18 + rawScore) * 100), 95),
    matchedSignals: [...symptomMatches, ...riskMatches],
    rationale: rule.rationale,
    afterEffects: rule.afterEffects,
    recommendations: rule.recommendations,
    urgency: rule.urgency,
  };
}

export async function generateMedicalInsight(input: PredictionInput) {
  const symptoms = input.symptoms
    .map((symptom) => symptom.trim())
    .filter(Boolean);

  if (symptoms.length < 2) {
    return {
      isValid: false,
      validationErrors: [
        "Please provide at least two symptoms for a meaningful educational prediction.",
      ],
      predictions: [],
      redFlags: [],
      similarCaseSignals: [],
      disclaimer:
        "This assistant is for supervised medical education only and is not a diagnosis.",
    };
  }

  const inputSignals = buildInputSignals({ ...input, symptoms });
  const outcomeBoosts = await getCaseOutcomeBoost(inputSignals);
  const predictions = knowledgeBase
    .map((rule) => {
      const matchedOutcome = outcomeBoosts.find(
        (outcome) =>
          normalize(outcome.diagnosis).includes(normalize(rule.condition)) ||
          normalize(rule.condition).includes(normalize(outcome.diagnosis)),
      );
      return buildPrediction(rule, inputSignals, matchedOutcome?.boost ?? 0);
    })
    .filter((prediction): prediction is DiseasePrediction =>
      Boolean(prediction),
    )
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 5);

  const redFlags = scoreSignals(inputSignals, redFlagSignals);

  return {
    isValid: true,
    validationErrors: [],
    predictions,
    redFlags,
    similarCaseSignals: outcomeBoosts.map((outcome) => ({
      diagnosis: outcome.diagnosis,
      matchedSignals: outcome.matches,
      confidenceBoost: Number(outcome.boost.toFixed(2)),
    })),
    recommendedNextStep:
      redFlags.length > 0
        ? "Red flags detected. Escalate to a senior clinician or emergency pathway immediately."
        : "Review the ranked hypotheses with a supervising clinician and confirm using history, examination, and appropriate investigations.",
    disclaimer:
      "This assistant is for supervised medical education only and is not a diagnosis.",
  };
}
