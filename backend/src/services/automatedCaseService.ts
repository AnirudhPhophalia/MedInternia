import mongoose from "mongoose";
import Case, { ICase } from "../models/Case";
import AutomatedCaseDraft, {
  IAutomatedCaseDraft,
  AutomatedCaseDraftStatus,
} from "../models/AutomatedCaseDraft";

type CaseDifficulty = "beginner" | "intermediate" | "advanced";
type PatientGender = "male" | "female" | "other";

interface AuthenticatedDoctor {
  _id: string;
  userType: string;
  specialization?: string;
}

interface CreateDraftInput {
  sourceCaseId?: string;
  title?: string;
  description?: string;
  symptoms?: string[];
  patientInfo?: {
    age?: number;
    gender?: PatientGender;
    medicalHistory?: string[];
    currentMedications?: string[];
  };
  diagnosis?: string;
  treatment?: string;
  tags?: string[];
  difficulty?: CaseDifficulty;
  specialization?: string;
  intervalDays?: number;
  scheduledFor?: string;
}

interface ReviewDraftInput {
  status: AutomatedCaseDraftStatus;
  reviewNotes?: string;
}

const DEFAULT_INTERVAL_DAYS = 7;

const normalizeList = (value?: string[]): string[] =>
  Array.isArray(value)
    ? value
        .map((item) => item.trim())
        .filter(Boolean)
        .slice(0, 12)
    : [];

const normalizeIntervalDays = (value?: number): number => {
  if (!Number.isFinite(value)) {
    return DEFAULT_INTERVAL_DAYS;
  }
  return Math.min(Math.max(Math.floor(value as number), 1), 365);
};

const anonymizeAge = (age?: number): number | undefined => {
  if (!Number.isFinite(age)) {
    return undefined;
  }
  const normalizedAge = Math.min(Math.max(Math.floor(age as number), 0), 150);
  if (normalizedAge < 18) {
    return normalizedAge;
  }
  return Math.round(normalizedAge / 5) * 5;
};

const buildScheduledDate = (
  scheduledFor?: string,
  intervalDays = DEFAULT_INTERVAL_DAYS,
): Date => {
  const parsedDate = scheduledFor ? new Date(scheduledFor) : undefined;
  if (parsedDate && !Number.isNaN(parsedDate.getTime())) {
    return parsedDate;
  }

  const scheduledDate = new Date();
  scheduledDate.setDate(scheduledDate.getDate() + intervalDays);
  return scheduledDate;
};

const buildSummary = (draft: {
  title: string;
  symptoms: string[];
  specialization: string;
  difficulty: CaseDifficulty;
}): string => {
  const symptomText =
    draft.symptoms.length > 0
      ? draft.symptoms.slice(0, 4).join(", ")
      : "a broad clinical presentation";

  return [
    `Practice case for ${draft.specialization}.`,
    `Learners should triage ${symptomText} and justify a ${draft.difficulty} level care plan.`,
    `The case is anonymized and intended for supervised intern discussion before publication.`,
  ].join(" ");
};

const buildLearningObjectives = (
  symptoms: string[],
  specialization: string,
  difficulty: CaseDifficulty,
): string[] => {
  const primarySymptom = symptoms[0] || "the chief complaint";
  return [
    `Identify priority red flags for ${primarySymptom}.`,
    `Build a differential diagnosis relevant to ${specialization}.`,
    `Select investigations and initial management appropriate for a ${difficulty} case.`,
  ];
};

const buildAnonymizationNotes = (
  input: CreateDraftInput,
  sourceCase?: ICase | null,
): string[] => {
  const notes = [
    "Direct patient identifiers are never copied into generated drafts.",
    "Age is rounded to a broad educational band for adult patients.",
    "Images and comments are excluded from automated drafts by default.",
  ];

  if (sourceCase) {
    const sourceCaseId = sourceCase._id as mongoose.Types.ObjectId;
    notes.push(
      `Draft derived from source case ${sourceCaseId.toString()} with clinical fields only.`,
    );
  }

  if (input.patientInfo?.currentMedications?.length) {
    notes.push(
      "Medication names are retained only when relevant to clinical reasoning.",
    );
  }

  return notes;
};

export const createAutomatedCaseDraft = async (
  user: AuthenticatedDoctor,
  input: CreateDraftInput,
): Promise<IAutomatedCaseDraft> => {
  if (user.userType !== "doctor") {
    throw new Error("Only doctors can generate automated case drafts");
  }

  const sourceCase =
    input.sourceCaseId && mongoose.Types.ObjectId.isValid(input.sourceCaseId)
      ? await Case.findById(input.sourceCaseId)
      : null;

  const title =
    input.title?.trim() || sourceCase?.title || "AI-generated practice case";
  const description =
    input.description?.trim() ||
    sourceCase?.description ||
    "Review the presentation, propose differential diagnoses, and document an evidence-based management plan.";
  const symptoms = normalizeList(
    input.symptoms?.length ? input.symptoms : sourceCase?.symptoms,
  );
  const diagnosis = input.diagnosis?.trim() || sourceCase?.diagnosis;
  const treatment = input.treatment?.trim() || sourceCase?.treatment;
  const tags = normalizeList(
    input.tags?.length ? input.tags : sourceCase?.tags,
  );
  const difficulty =
    input.difficulty || sourceCase?.difficulty || "intermediate";
  const specialization =
    input.specialization?.trim() ||
    sourceCase?.specialization ||
    user.specialization ||
    "General Medicine";
  const intervalDays = normalizeIntervalDays(input.intervalDays);

  const patientInfo = {
    age: anonymizeAge(input.patientInfo?.age ?? sourceCase?.patientInfo?.age),
    gender: input.patientInfo?.gender ?? sourceCase?.patientInfo?.gender,
    medicalHistory: normalizeList(
      input.patientInfo?.medicalHistory ??
        sourceCase?.patientInfo?.medicalHistory,
    ),
    currentMedications: normalizeList(
      input.patientInfo?.currentMedications ??
        sourceCase?.patientInfo?.currentMedications,
    ),
  };

  return AutomatedCaseDraft.create({
    title,
    description,
    symptoms,
    patientInfo,
    diagnosis,
    treatment,
    tags: [...new Set([...tags, "ai-generated", "practice-case"])],
    difficulty,
    specialization,
    generatedSummary: buildSummary({
      title,
      symptoms,
      specialization,
      difficulty,
    }),
    learningObjectives: buildLearningObjectives(
      symptoms,
      specialization,
      difficulty,
    ),
    anonymizationNotes: buildAnonymizationNotes(input, sourceCase),
    sourceCase: sourceCase?._id,
    scheduledFor: buildScheduledDate(input.scheduledFor, intervalDays),
    intervalDays,
    status: "review",
    createdBy: user._id,
  });
};

export const reviewAutomatedCaseDraft = async (
  draftId: string,
  user: AuthenticatedDoctor,
  input: ReviewDraftInput,
): Promise<IAutomatedCaseDraft | null> => {
  const allowedStatuses: AutomatedCaseDraftStatus[] = [
    "review",
    "approved",
    "rejected",
  ];
  if (!allowedStatuses.includes(input.status)) {
    throw new Error("Draft can only move to review, approved, or rejected");
  }

  return AutomatedCaseDraft.findOneAndUpdate(
    { _id: draftId, createdBy: user._id },
    {
      status: input.status,
      reviewNotes: input.reviewNotes?.trim(),
      reviewedAt: new Date(),
    },
    { new: true, runValidators: true },
  );
};

export const publishAutomatedCaseDraft = async (
  draftId: string,
  user: AuthenticatedDoctor,
): Promise<{ draft: IAutomatedCaseDraft; case: ICase } | null> => {
  const draft = await AutomatedCaseDraft.findOne({
    _id: draftId,
    createdBy: user._id,
  });
  if (!draft) {
    return null;
  }
  if (draft.status !== "approved") {
    throw new Error("Only approved drafts can be published");
  }

  const publishedCase = await Case.create({
    title: draft.title,
    description: `${draft.description}\n\nLearning objectives:\n${draft.learningObjectives.map((item) => `- ${item}`).join("\n")}`,
    symptoms: draft.symptoms,
    patientInfo: draft.patientInfo,
    diagnosis: draft.diagnosis,
    treatment: draft.treatment,
    images: [],
    tags: draft.tags,
    difficulty: draft.difficulty,
    specialization: draft.specialization,
    doctor: user._id,
    isPatientCase: false,
    pointsAwarded: 0,
    canRepost: false,
  });

  draft.status = "published";
  draft.publishedCase = publishedCase._id as mongoose.Types.ObjectId;
  await draft.save();

  return { draft, case: publishedCase };
};

export const publishDueAutomatedCaseDrafts = async (
  user: AuthenticatedDoctor,
  limit = 5,
): Promise<Array<{ draft: IAutomatedCaseDraft; case: ICase }>> => {
  const safeLimit = Math.min(Math.max(Math.floor(limit), 1), 25);
  const dueDrafts = await AutomatedCaseDraft.find({
    createdBy: user._id,
    status: "approved",
    scheduledFor: { $lte: new Date() },
  })
    .sort({ scheduledFor: 1 })
    .limit(safeLimit);

  const published: Array<{ draft: IAutomatedCaseDraft; case: ICase }> = [];
  for (const draft of dueDrafts) {
    const draftId = draft._id as mongoose.Types.ObjectId;
    const result = await publishAutomatedCaseDraft(draftId.toString(), user);
    if (result) {
      published.push(result);
    }
  }

  return published;
};
