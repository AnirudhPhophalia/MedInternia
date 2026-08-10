import mongoose from "mongoose";
import { createAndEmitNotification } from "./notificationController";
import { Response } from "express";
import Case from "../models/Case";
import User from "../models/User";
import Rating from "../models/Rating";
import AICasePostSchedule from "../models/AICasePostSchedule";
import { AuthRequest } from "../middleware/auth";
import {
  buildAICaseSchedule,
  getNextAICasePostDate,
} from "../services/aiCasePostingService";
import { analyzeCase } from "../services/aiTaggerService";
import { deleteCaseVectors, ingestCase, suggestCases } from "../services/ragService";
import { enqueueCaseModeration } from "../jobs/caseModerationJob";
import { asyncHandler } from "../utils/asyncHandler";
import { AppError } from "../utils/AppError";
import { uploadCaseAttachment, generateSignedUrl } from "../utils/cloudinary";
import { parsePagination, buildPaginationMeta } from "../utils/pagination";
import { USER_PUBLIC_FIELDS, DOCTOR_FIELDS } from "../utils/userFields";

const getId = (id: string | string[]): string => Array.isArray(id) ? id[0] : id;
const canModerateComments = (userType?: string) => ["admin", "doctor", "moderator"].includes(userType ?? "");
const canAddCaseFollowUp = (userType?: string) => ["admin", "doctor", "intern", "hospital_staff"].includes(userType ?? "");
const canModerateCases = (userType?: string) => ["admin", "doctor", "moderator"].includes(userType ?? "");

const CASE_UPDATABLE_FIELDS = [
  "title",
  "description",
  "symptoms",
  "patientInfo",
  "diagnosis",
  "treatment",
  "images",
  "attachments",
  "tags",
  "difficulty",
  "specialization",
  "isRareDisease",
  "verifiedDoctorsOnly",
] as const;

// Get all approved cases with filtering capability
export const getCases = asyncHandler(async (req: AuthRequest, res: Response) => {
  const filter: any = {
    isActive: { $ne: false },
    $or: [
      { moderationStatus: "approved" },
      { moderationStatus: { $exists: false } },
    ],
  };

  if (req.query.specialization) {
    filter.specialization = { $regex: String(req.query.specialization), $options: "i" };
  }
  if (req.query.difficulty) {
    filter.difficulty = req.query.difficulty;
  }
  if (req.query.isRareDisease !== undefined) {
    filter.isRareDisease = String(req.query.isRareDisease) === "true";
  }

  const page = Math.max(1, parseInt(String(req.query.page ?? "1"), 10) || 1);
  const limit = Math.max(1, parseInt(String(req.query.limit ?? "10"), 10) || 10);
  const skip = (page - 1) * limit;

  const [cases, total] = await Promise.all([
    Case.find(filter)
      .populate("doctor", DOCTOR_FIELDS)
      .skip(skip)
      .limit(limit),
    Case.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: {
      cases,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    },
  });
});

// Get a single case by ID
export const getCaseById = asyncHandler(async (req: AuthRequest, res: Response) => {
  const baseFilter = {
    isActive: { $ne: false },
    $or: [
      { moderationStatus: "approved" },
      { moderationStatus: { $exists: false } },
    ],
  };

  const caseDoc = await Case.findOne({
    _id: getId(req.params.id),
    ...baseFilter,
  })
    .populate("doctor", "firstName lastName specialization avatar medicalLicenseVerified")
    .populate("comments.author", USER_PUBLIC_FIELDS)
    .populate("followUps.author", "firstName lastName userType avatar");

  if (!caseDoc) {
    throw new AppError("Case not found or not approved", 404);
  }
  res.json({ success: true, data: { case: caseDoc } });
});

// Update a case
export const updateCase = asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = req.user;
  if (!user) {
    throw new AppError("User not authenticated", 401);
  }
  const caseDoc = await Case.findById(getId(req.params.id));
  if (!caseDoc) {
    throw new AppError("Case not found", 404);
  }
  if ((caseDoc as any).doctor?.toString() !== user._id!.toString() && user.userType !== "admin") {
    throw new AppError("You can only update your own cases", 403);
  }

  const updates: any = {};
  for (const field of CASE_UPDATABLE_FIELDS) {
    if (req.body[field] !== undefined) {
      updates[field] = req.body[field];
    }
  }

  const updatedCase = await Case.findByIdAndUpdate(
    getId(req.params.id),
    updates,
    { new: true, runValidators: true }
  ).populate("doctor", "firstName lastName specialization");

  if (updatedCase && (updatedCase as any).moderationStatus === "approved") {
    await ingestCase(
      String((updatedCase as any)._id),
      `${(updatedCase as any).title}\n${(updatedCase as any).description}`,
      {
        specialization: (updatedCase as any).specialization,
        isPatientCase: (updatedCase as any).isPatientCase,
      }
    );
  }

  res.json({ success: true, message: "Case updated successfully", data: { case: updatedCase } });
});

// Delete a case (soft delete)
export const deleteCase = asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = req.user;
  if (!user) {
    throw new AppError("User not authenticated", 401);
  }
  const caseDoc = await Case.findById(getId(req.params.id));
  if (!caseDoc) {
    throw new AppError("Case not found", 404);
  }
  if ((caseDoc as any).doctor?.toString() !== user._id!.toString() && user.userType !== "admin") {
    throw new AppError("You can only delete your own cases", 403);
  }

  await Case.findByIdAndUpdate(getId(req.params.id), { isActive: false });
  await deleteCaseVectors(getId(req.params.id));
  res.json({ success: true, message: "Case deleted successfully" });
});

// Get user's own cases
export const getMyCases = asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = req.user;
  if (!user) {
    throw new AppError("User not authenticated", 401);
  }
  const cases = await Case.find({ doctor: user._id, isActive: { $ne: false } }).sort({ createdAt: -1 });
  res.json({ success: true, data: { cases } });
});

// Like / Unlike toggle logic
export const toggleLike = asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = req.user;
  if (!user) {
    throw new AppError("User not authenticated", 401);
  }
  const caseDoc = await Case.findById(getId(req.params.id));
  if (!caseDoc) {
    throw new AppError("Case not found", 404);
  }
  const userIdStr = user._id!.toString();
  const likesArray = ((caseDoc as any).likes || []) as any[];
  const hasLiked = likesArray.some((id: any) => id.toString() === userIdStr);

  if (hasLiked) {
    await Case.findByIdAndUpdate(caseDoc._id, { $pull: { likes: user._id } });
  } else {
    await Case.findByIdAndUpdate(caseDoc._id, { $addToSet: { likes: user._id } });
  }

  const updatedCase = await Case.findById(caseDoc._id);
  res.json({
    success: true,
    message: hasLiked ? "Case unliked" : "Case liked",
    data: { likesCount: ((updatedCase as any).likes || []).length, hasLiked: !hasLiked },
  });
});

// Star / Unstar toggle logic
export const toggleStar = asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = req.user;
  if (!user) {
    throw new AppError("User not authenticated", 401);
  }
  const caseDoc = await Case.findById(getId(req.params.id));
  if (!caseDoc) {
    throw new AppError("Case not found", 404);
  }

  const userDoc = await User.findById(user._id);
  const savedCases = ((userDoc as any)?.savedCases || []) as any[];
  const hasStarred = savedCases.some((id: any) => id.toString() === (caseDoc as any)._id?.toString());

  if (hasStarred) {
    await User.findByIdAndUpdate(user._id, { $pull: { savedCases: caseDoc._id } });
  } else {
    await User.findByIdAndUpdate(user._id, { $addToSet: { savedCases: caseDoc._id } });
  }

  res.json({
    success: true,
    message: hasStarred ? "Case unstarred" : "Case starred",
    data: { hasStarred: !hasStarred },
  });
});

export const getStarredCases = asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = req.user;
  if (!user) {
    throw new AppError("User not authenticated", 401);
  }
  const { page, limit, skip } = parsePagination(req.query);

  const baseFilter = {
    isActive: { $ne: false },
    $or: [
      { moderationStatus: "approved" },
      { moderationStatus: { $exists: false } },
    ],
  };

  const userDoc = await User.findById(user._id).select("savedCases");
  const savedCaseIds = (userDoc as any)?.savedCases || [];

  if (savedCaseIds.length === 0) {
    res.json({
      success: true,
      data: { cases: [] },
      pagination: buildPaginationMeta(page, limit, 0)
    });
    return;
  }

  const filter = { _id: { $in: savedCaseIds }, ...baseFilter };

  const [cases, total] = await Promise.all([
    Case.find(filter)
      .populate("doctor", "firstName lastName specialization avatar")
      .skip(skip)
      .limit(limit),
    Case.countDocuments(filter)
  ]);

  res.json({
    success: true,
    data: { cases },
    pagination: buildPaginationMeta(page, limit, total)
  });
});

export const getLikedCases = asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = req.user;
  if (!user) {
    throw new AppError("User not authenticated", 401);
  }
  const { page, limit, skip } = parsePagination(req.query);

  const baseFilter = {
    isActive: { $ne: false },
    $or: [
      { moderationStatus: "approved" },
      { moderationStatus: { $exists: false } },
    ],
  };

  const filter = { likes: user._id, ...baseFilter };

  const [cases, total] = await Promise.all([
    Case.find(filter)
      .populate("doctor", "firstName lastName specialization avatar")
      .skip(skip)
      .limit(limit),
    Case.countDocuments(filter)
  ]);

  res.json({
    success: true,
    data: { cases },
    pagination: buildPaginationMeta(page, limit, total)
  });
});

// Add comment (w/ notification & corrected error signature)
export const addComment = asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = req.user;
  const { content } = req.body;
  if (!user) {
    throw new AppError("User not authenticated", 401);
  }
  if (!content?.trim()) {
    throw new AppError("Comment content is required", 400);
  }
  const caseDoc = await Case.findById(getId(req.params.id));
  if (!caseDoc) {
    throw new AppError("Case not found", 404);
  }

  const alreadyExists = caseDoc.comments.some(
    (c: any) => c.author.toString() === user._id!.toString() && c.content === content.trim()
  );
  if (alreadyExists) {
    throw new AppError("Duplicate comment detected", 400);
  }

  const newComment = {
    _id: new mongoose.Types.ObjectId(),
    author: user._id,
    content: content.trim(),
    likes: [],
    ratedBy: [],
    replies: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  caseDoc.comments.push(newComment as any);
  await caseDoc.save();

  const doctorField = (caseDoc as any).doctor;
  const doctorId = doctorField?._id ? doctorField._id.toString() : doctorField?.toString();

  if (doctorId) {
    await createAndEmitNotification({
      recipientId: doctorId,
      type: "comment",
      message: `${user.firstName || "Someone"} commented on your case.`,
      link: `/cases/${caseDoc._id}`,
    });
  }

  res.status(201).json({ success: true, message: "Comment added", data: { comment: newComment } });
});

// Pin / Unpin comment management
export const pinComment = asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = req.user;
  const { caseId, commentId } = req.params;
  if (!user) throw new AppError("User not authenticated", 401);

  const caseDoc = await Case.findById(getId(caseId));
  if (!caseDoc) throw new AppError("Case not found", 404);
  if ((caseDoc as any).doctor?.toString() !== user._id!.toString()) {
    throw new AppError("Only the case author can pin comments", 403);
  }

  await Case.updateOne(
    { _id: getId(caseId), "comments._id": getId(commentId) },
    { $set: { "comments.$.isPinned": true } }
  );
  res.json({ success: true, message: "Comment pinned successfully" });
});

export const unpinComment = asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = req.user;
  const { caseId, commentId } = req.params;
  if (!user) throw new AppError("User not authenticated", 401);

  const caseDoc = await Case.findById(getId(caseId));
  if (!caseDoc) throw new AppError("Case not found", 404);
  if ((caseDoc as any).doctor?.toString() !== user._id!.toString()) {
    throw new AppError("Only the case author can unpin comments", 403);
  }

  await Case.updateOne(
    { _id: getId(caseId), "comments._id": getId(commentId) },
    { $set: { "comments.$.isPinned": false } }
  );
  res.json({ success: true, message: "Comment unpinned successfully" });
});

export const getPinnedComments = asyncHandler(async (req: AuthRequest, res: Response) => {
  const caseDoc = await Case.findById(getId(req.params.caseId));
  if (!caseDoc) throw new AppError("Case not found", 404);
  const pinned = caseDoc.comments.filter((c: any) => c.isPinned === true);
  res.json({ success: true, data: { comments: pinned } });
});

export const toggleRepostPermission = asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = req.user;
  if (!user) throw new AppError("User not authenticated", 401);

  const caseDoc = await Case.findById(getId(req.params.id));
  if (!caseDoc) throw new AppError("Case not found", 404);
  if ((caseDoc as any).doctor?.toString() !== user._id!.toString()) {
    throw new AppError("Only the case author can change repost permissions", 403);
  }

  const currentVal = (caseDoc as any).canRepost === true;
  await Case.findByIdAndUpdate(caseDoc._id, { $set: { canRepost: !currentVal } });
  res.json({ success: true, data: { canRepost: !currentVal } });
});

export const repostCase = asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = req.user;
  if (!user) throw new AppError("User not authenticated", 401);

  const originalCase = await Case.findById(getId(req.params.id));
  if (!originalCase) throw new AppError("Case not found", 404);
  if (!(originalCase as any).canRepost) {
    throw new AppError("This case cannot be reposted per author restrictions", 400);
  }

  const newRepost = await Case.create({
    title: `Repost: ${originalCase.title}`,
    description: originalCase.description,
    symptoms: originalCase.symptoms,
    patientInfo: originalCase.patientInfo,
    difficulty: originalCase.difficulty,
    specialization: originalCase.specialization,
    tags: originalCase.tags,
    images: originalCase.images,
    attachments: originalCase.attachments,
    diagnosis: originalCase.diagnosis,
    treatment: originalCase.treatment,
    isRareDisease: originalCase.isRareDisease,
    doctor: user._id,
    isPatientCase: false,
    moderationStatus: "pending",
  });

  // Reposts go through the same moderation queue as new cases so that spam or
  // duplicate AI-generated content cannot bypass review by reposting.
  await enqueueCaseModeration(String(newRepost._id));

  res.status(201).json({ success: true, message: "Case reposted successfully", data: { case: newRepost } });
});

export const solveCase = asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = req.user;
  const { finalDiagnosis, notes } = req.body;
  if (!user) throw new AppError("User not authenticated", 401);

  const caseDoc = await Case.findById(getId(req.params.id));
  if (!caseDoc) throw new AppError("Case not found", 404);
  if ((caseDoc as any).doctor?.toString() !== user._id!.toString()) {
    throw new AppError("Only the case author can solve this case", 403);
  }

  await Case.findByIdAndUpdate(caseDoc._id, {
    $set: {
      status: "solved",
      resolution: { finalDiagnosis, notes, resolvedAt: new Date() }
    }
  });
  res.json({ success: true, message: "Case resolved successfully" });
});

export const getRecommendedCases = asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = req.user;
  if (!user) throw new AppError("User not authenticated", 401);
  const spec = (user as any).specialization || "General Medicine";

  const baseFilter = {
    isActive: { $ne: false },
    $or: [
      { moderationStatus: "approved" },
      { moderationStatus: { $exists: false } },
    ],
  };

  const cases = await Case.find({
    specialization: spec,
    doctor: { $ne: user._id },
    ...baseFilter
  }).limit(5);

  res.json({ success: true, data: { cases } });
});

export const getFlaggedComments = asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = req.user;
  if (!canModerateComments(user?.userType)) {
    throw new AppError("Access denied", 403);
  }
  const cases = await Case.find({ "comments.moderationStatus": "flagged" });
  const flaggedComments: any[] = [];
  for (const c of cases) {
    for (const comment of c.comments) {
      if ((comment as any).moderationStatus === "flagged") {
        flaggedComments.push({ caseId: c._id, caseTitle: c.title, comment });
      }
    }
  }
  res.json({ success: true, data: { comments: flaggedComments } });
});

export const moderateComment = asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = req.user;
  if (!canModerateComments(user?.userType)) {
    throw new AppError("Access denied", 403);
  }
  const { caseId, commentId } = req.params;
  const { status } = req.body;

  await Case.updateOne(
    { _id: getId(caseId), "comments._id": getId(commentId) },
    { $set: { "comments.$.moderationStatus": status } }
  );
  res.json({ success: true, message: "Comment moderated successfully" });
});

export const getCaseModerationQueue = asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = req.user;
  if (!canModerateCases(user?.userType)) {
    throw new AppError("Access denied", 403);
  }
  const cases = await Case.find({ moderationStatus: "pending" });
  res.json({ success: true, data: { cases } });
});

export const moderateCase = asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = req.user;
  if (!canModerateCases(user?.userType)) {
    throw new AppError("Access denied", 403);
  }
  const { status, reason } = req.body;
  const updated = await Case.findByIdAndUpdate(
    getId(req.params.id),
    {
      $set: { moderationStatus: status },
      $push: { moderationAuditTrail: { status, reason, reviewedBy: user?._id, reviewedAt: new Date() } }
    },
    { new: true }
  );
  res.json({ success: true, data: { case: updated } });
});

export const generateAISuggestions = asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = req.user;
  if (!user) throw new AppError("User not authenticated", 401);

  const caseDoc = await Case.findById(getId(req.params.id));
  if (!caseDoc) throw new AppError("Case not found", 404);

  if ((caseDoc as any).doctor?.toString() !== user._id!.toString()) {
    throw new AppError("You can only generate AI suggestions for your own cases", 403);
  }

  const spec = (caseDoc as any).specialization || "General Medicine";
  const analysis = await analyzeCase(caseDoc.title, caseDoc.description, spec);

  await Case.findByIdAndUpdate(caseDoc._id, { $set: { aiAnalysis: analysis } });
  res.json({ success: true, data: { suggestions: analysis } });
});

export const getCaseAISuggestions = asyncHandler(async (req: AuthRequest, res: Response) => {
  const caseDoc = await Case.findById(getId(req.params.id));
  if (!caseDoc) throw new AppError("Case not found", 404);
  res.json({ success: true, data: { aiAnalysis: (caseDoc as any).aiAnalysis || null } });
});

export const addFollowUp = asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = req.user;
  if (!user || !canAddCaseFollowUp(user.userType)) {
    throw new AppError("Unauthorized role", 403);
  }
  const { content } = req.body;
  const caseDoc = await Case.findById(getId(req.params.id));
  if (!caseDoc) throw new AppError("Case not found", 404);

  const userId = String(user._id);
  const caseOwnerId = String((caseDoc as any).doctor);
  const isAdmin = user.userType === "admin";
  const isCaseOwner = caseOwnerId === userId;
  const hasPriorComment = ((caseDoc as any).comments || []).some(
    (comment: any) => comment.author?.toString() === userId
  );

  let hasMentoringRelationship = false;
  if (!isAdmin && !isCaseOwner && !hasPriorComment) {
    if (user.userType === "doctor") {
      const caseOwner = await User.findById(caseOwnerId).select("mentorDoctor");
      hasMentoringRelationship = caseOwner?.mentorDoctor?.toString() === userId;
    } else if (user.userType === "intern" && (user as any).mentorDoctor) {
      hasMentoringRelationship =
        (user as any).mentorDoctor.toString() === caseOwnerId;
    }
  }

  if (!isAdmin && !isCaseOwner && !hasPriorComment && !hasMentoringRelationship) {
    throw new AppError("Forbidden: you cannot add a follow-up on this case", 403);
  }

  const newFollowUp = {
    _id: new mongoose.Types.ObjectId(),
    author: user._id,
    content,
    createdAt: new Date()
  };

  await Case.findByIdAndUpdate(caseDoc._id, { $push: { followUps: newFollowUp } });
  res.status(201).json({ success: true, data: { followUp: newFollowUp } });
});

export const getCaseFollowUps = asyncHandler(async (req: AuthRequest, res: Response) => {
  const caseDoc = await Case.findById(getId(req.params.id));
  if (!caseDoc) throw new AppError("Case not found", 404);
  res.json({ success: true, data: { followUps: (caseDoc as any).followUps || [] } });
});

export const scheduleAICasePost = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const user = req.user;
    if (!user) {
      throw new AppError("User not authenticated", 401);
    }
    const schedulePayload = buildAICaseSchedule(req.body);
    const schedule = await AICasePostSchedule.create({
      author: user._id,
      generatedCase: schedulePayload.generatedCase,
      interval: schedulePayload.interval,
      scheduledFor: schedulePayload.scheduledFor,
      nextRunAt: schedulePayload.scheduledFor,
      reviewStatus: "pending",
    });
    return res.status(201).json({
      success: true,
      message: "AI case draft scheduled for clinical review",
      data: { schedule },
    });
  }
);

export const getMyAICaseSchedules = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const user = req.user;
    if (!user) {
      throw new AppError("User not authenticated", 401);
    }
    const schedules = await AICasePostSchedule.find({
      author: user._id,
      isActive: true,
    })
      .populate("publishedCase", "title createdAt")
      .sort({ nextRunAt: 1 });
    return res.json({
      success: true,
      data: { schedules },
    });
  }
);

export const reviewAICasePost = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const user = req.user;
    const { scheduleId } = req.params;
    const { reviewStatus, reviewNotes } = req.body;
    if (!user) {
      throw new AppError("User not authenticated", 401);
    }
    if (!["approved", "changes_requested", "rejected"].includes(reviewStatus as string)) {
      throw new AppError("reviewStatus mismatch error", 400);
    }
    const existingSchedule = await AICasePostSchedule.findById(scheduleId);
    if (!existingSchedule) {
      throw new AppError("AI case schedule not found", 404);
    }
    // Only the owning doctor (or an admin) may review the schedule; otherwise a
    // doctor could approve/reject another doctor's draft and force it published.
    if (user.userType !== 'admin' && existingSchedule.author.toString() !== user._id!.toString()) {
      throw new AppError("You can only review your own AI case schedules", 403);
    }
    const schedule = await AICasePostSchedule.findByIdAndUpdate(
      scheduleId,
      {
        reviewStatus,
        reviewNotes: typeof reviewNotes === "string" ? reviewNotes.trim() : undefined,
        reviewedBy: user._id,
        reviewedAt: new Date(),
      },
      { new: true, runValidators: true }
    );
    return res.json({ success: true, data: { schedule } });
  }
);

export const publishDueAICasePosts = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const user = req.user;
    if (!user) {
      throw new AppError("User not authenticated", 401);
    }
    const isAdmin = user.userType === 'admin';

    // Non-admins may only publish their own schedules or schedules explicitly
    // admin-approved (reviewedBy is an admin). Otherwise any doctor could force
    // another doctor's drafted schedule onto the public feed. Admins may publish
    // any approved due schedule.
    const query: mongoose.FilterQuery<InstanceType<typeof AICasePostSchedule>> = {
      isActive: true,
      reviewStatus: "approved",
      nextRunAt: { $lte: new Date() },
    };
    if (!isAdmin) {
      const adminUserIds = await User.find({ userType: 'admin' }).select('_id');
      query.$or = [
        { author: user._id },
        { reviewedBy: { $in: adminUserIds.map(admin => admin._id) } },
      ];
    }
    const dueSchedules = await AICasePostSchedule.find(query).limit(10);
    const published: any[] = [];
    for (const schedule of dueSchedules) {
      const generatedCase = schedule.generatedCase;
      const publishedCase = await Case.create({
        title: generatedCase.title,
        description: generatedCase.description,
        symptoms: generatedCase.symptoms,
        patientInfo: generatedCase.patientInfo,
        diagnosis: generatedCase.diagnosis,
        treatment: generatedCase.treatment,
        tags: generatedCase.tags,
        difficulty: generatedCase.difficulty,
        specialization: generatedCase.specialization,
        doctor: schedule.author,
        isPatientCase: false,
        moderationStatus: "approved",
        moderationAuditTrail: [
          {
            status: "approved",
            reason: "AI publication automatic execution",
            reviewedBy: schedule.reviewedBy,
            reviewedAt: schedule.reviewedAt ?? new Date(),
          },
        ],
        pointsAwarded: 0,
      });
      (schedule as any).publishedCase = publishedCase._id;
      schedule.lastPublishedAt = new Date();
      schedule.nextRunAt = getNextAICasePostDate(schedule.nextRunAt, schedule.interval);
      await schedule.save();
      published.push(publishedCase);
    }
    return res.json({ success: true, data: { count: published.length, cases: published } });
  }
);

export const replyToComment = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const user = req.user;
    const { caseId, commentId } = req.params;
    const { content } = req.body;
    if (!user) throw new AppError("User not authenticated", 401);
    if (!content?.trim()) throw new AppError("Reply content is required", 400);

    const caseDoc = await Case.findById(getId(caseId));
    if (!caseDoc) throw new AppError("Case not found", 404);

    const parentComment = caseDoc.comments.find((c: any) => c._id?.toString() === getId(commentId));
    if (!parentComment) throw new AppError("Comment not found", 404);

    const reply = {
      author: user._id,
      content: content.trim(),
      likes: [],
      ratedBy: [],
      replies: [],
      replyTo: parentComment._id,
      createdAt: new Date(),
      updatedAt: new Date(),
      _id: new mongoose.Types.ObjectId(),
    };
    caseDoc.comments.push(reply as any);
    parentComment.replies.push(reply._id as any);
    await caseDoc.save();

    if (parentComment.author.toString() !== user._id!.toString()) {
      await createAndEmitNotification({
        recipientId: parentComment.author.toString(),
        type: "comment",
        message: `Someone replied to your comment`,
        link: `/cases/${caseId}`,
      });
    }
    res.status(201).json({ success: true, data: { reply } });
  }
);

export const likeComment = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const user = req.user;
    const { caseId, commentId } = req.params;
    if (!user) throw new AppError("User not authenticated", 401);

    const userIdObj = new mongoose.Types.ObjectId(user._id!.toString());

    // Verify the case and comment exist before mutating likes so we never
    // report success for a missing case or comment.
    const caseDoc = await Case.findOne(
      { _id: getId(caseId), "comments._id": getId(commentId) },
      { "comments.$": 1 }
    );
    if (!caseDoc) {
      const caseExists = await Case.exists({ _id: getId(caseId) });
      if (!caseExists) throw new AppError("Case not found", 404);
      throw new AppError("Comment not found", 404);
    }

    let liked = false;
    const pullResult = await Case.updateOne(
      { _id: getId(caseId), "comments._id": getId(commentId) },
      { $pull: { "comments.$.likes": userIdObj } }
    );
    if (pullResult.modifiedCount === 0) {
      await Case.updateOne(
        { _id: getId(caseId), "comments._id": getId(commentId) },
        { $addToSet: { "comments.$.likes": userIdObj } }
      );
      liked = true;
    }
    const updatedCase = await Case.findById(getId(caseId), {
      comments: { $elemMatch: { _id: getId(commentId) } },
    });
    const likes = ((updatedCase?.comments as any)?.[0]?.likes as any[])?.length ?? 0;
    res.json({ success: true, data: { likes, liked } });
  }
);

export const rateComment = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const user = req.user;
    const { caseId, commentId } = req.params;
    const { rating } = req.body;
    if (!user) throw new AppError("User not authenticated", 401);
    if (!rating || rating < 1 || rating > 5) throw new AppError("Rating bounds error", 400);

    const caseDoc = await Case.findById(getId(caseId), {
      comments: { $elemMatch: { _id: getId(commentId) } },
    });
    if (!caseDoc || !(caseDoc.comments as any)?.[0]) throw new AppError("Not found", 404);

    const userIdObj = new mongoose.Types.ObjectId(user._id!.toString());
    const commentIdObj = new mongoose.Types.ObjectId(getId(commentId));
    const existingRating = await Rating.findOne({ rater: userIdObj, commentId: commentIdObj });

    let rated = false;
    if (existingRating) {
      await Rating.deleteOne({ _id: existingRating._id });
      await Case.updateOne(
        { _id: getId(caseId), "comments._id": getId(commentId) },
        { $pull: { "comments.$.ratedBy": userIdObj } }
      );
    } else {
      try {
        await Rating.create({
          rater: userIdObj,
          commentId: commentIdObj,
          caseId: new mongoose.Types.ObjectId(getId(caseId)),
          rating,
        });
      } catch (err: any) {
        if (err.code === 11000) throw new AppError("Already rated", 409);
        throw err;
      }
      await Case.updateOne(
        { _id: getId(caseId), "comments._id": getId(commentId) },
        { $addToSet: { "comments.$.ratedBy": userIdObj } }
      );
      rated = true;
    }
    const aggResult = await Rating.aggregate([
      { $match: { commentId: commentIdObj } },
      { $group: { _id: null, avg: { $avg: "$rating" }, count: { $sum: 1 } } },
    ]);
    const avgRating = aggResult.length > 0 ? Math.round(aggResult[0].avg) : undefined;
    await Case.updateOne(
      { _id: getId(caseId), "comments._id": getId(commentId) },
      { $set: { "comments.$.rating": avgRating ?? null } }
    );
    res.json({ success: true, data: { rating: avgRating, rated } });
  }
);

export const uploadAttachment = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const user = req.user;
    if (!user) throw new AppError("User not authenticated", 401);
    if (!req.file) throw new AppError("No file uploaded", 400);

    const uploadResult = await uploadCaseAttachment(req.file, String(user._id));
    let type = 'image';
    if (uploadResult.resource_type === 'video') {
      type = req.file.mimetype.startsWith('audio/') ? 'audio' : 'video';
    }

    // Generate a signed URL for authenticated access (15-minute expiry)
    const signedUrl = generateSignedUrl(uploadResult.public_id, 900);

    res.status(201).json({
      success: true,
      data: {
        signedUrl,
        publicId: uploadResult.public_id,
        type,
        expiresIn: 900
      }
    });
  }
);

// Create case
export const createCase = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const user = req.user;
    if (!user) throw new AppError("User not authenticated", 401);
    if (user.userType !== "doctor" && user.userType !== "patient") {
      throw new AppError("Role restriction error", 403);
    }
    const { title, description, specialization } = req.body;
    const spec = specialization || (user as any).specialization || "General Medicine";
    const aiAnalysis = await analyzeCase(title, description, spec);

    if (user.userType === "patient") {
      const newCase = new Case({
        title,
        description,
        symptoms: aiAnalysis.symptoms,
        patientInfo: req.body.patientInfo || {},
        diagnosis: aiAnalysis.diagnosis,
        treatment: aiAnalysis.treatment,
        doctor: user._id,
        isPatientCase: true,
        specialization: spec,
        moderationStatus: "pending",
        pointsAwarded: 0,
      });
      await newCase.save();
      await enqueueCaseModeration(String(newCase._id));

      return res.status(201).json({ success: true, data: { case: newCase } });
    }

    const newCase = new Case({
      title,
      description,
      symptoms: aiAnalysis.symptoms,
      patientInfo: req.body.patientInfo || {},
      diagnosis: aiAnalysis.diagnosis,
      treatment: aiAnalysis.treatment,
      doctor: user._id,
      isPatientCase: false,
      specialization: spec,
      moderationStatus: "pending",
      pointsAwarded: 0,
    });

    await newCase.save();
    await enqueueCaseModeration(String(newCase._id));

    res.status(201).json({ success: true, data: { case: newCase } });
  }
);

export const getSimilarCases = asyncHandler(async (req: AuthRequest, res: Response) => {
  const caseDoc = await Case.findById(getId(req.params.id));
  if (!caseDoc) {
    throw new AppError("Case not found", 404);
  }

  const text = `${caseDoc.title}\n${caseDoc.description}`;
  const similar = await suggestCases(text, 3);

  res.json({ success: true, data: { similarCases: similar } });
});
