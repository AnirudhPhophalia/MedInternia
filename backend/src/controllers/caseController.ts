import mongoose, { ObjectId, Types } from "mongoose";
import { createAndEmitNotification } from "./notificationController";
import { Response } from "express";
import Case, { ICase } from "../models/Case";
import User from "../models/User";
import Rating from "../models/Rating";
import Notification from "../models/Notification";
import AICasePostSchedule from "../models/AICasePostSchedule";
import { AuthRequest } from "../middleware/auth";
import {
  buildAICaseSchedule,
  getNextAICasePostDate,
} from "../services/aiCasePostingService";
import { analyzeCase } from "../services/aiTaggerService";
import { asyncHandler } from "../utils/asyncHandler";
import { AppError } from "../utils/AppError";
import { extractEntities } from "../services/nerService";
import { extractSymptoms } from "../services/symptomExtractionService";
import { uploadCaseAttachment } from "../utils/cloudinary";

// Helper to normalize ID from params (handles string | string[])
const getId = (id: string | string[]): string => Array.isArray(id) ? id[0] : id;
const canModerateComments = (userType?: string) =>
  ["admin", "doctor", "moderator"].includes(userType ?? "");
const canAddCaseFollowUp = (userType?: string) =>
  ["admin", "doctor", "intern", "hospital_staff"].includes(userType ?? "");
const canModerateCases = (userType?: string) =>
  ["admin", "doctor", "moderator"].includes(userType ?? "");

const publicCaseFilter = {
  $or: [
    { moderationStatus: "approved" },
    { moderationStatus: { $exists: false } },
  ],
};

// Only case content fields should be editable by the case owner here.
// Ownership, points, status, moderation, comments, and likes are handled by
// dedicated flows so they stay protected from mass-assignment payloads.
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
      throw new AppError(
        "reviewStatus must be approved, changes_requested, or rejected",
        400
      );
    }
    const schedule = await AICasePostSchedule.findByIdAndUpdate(
      scheduleId,
      {
        reviewStatus,
        reviewNotes:
          typeof reviewNotes === "string" ? reviewNotes.trim() : undefined,
        reviewedBy: user._id,
        reviewedAt: new Date(),
      },
      { new: true, runValidators: true }
    );
    if (!schedule) {
      throw new AppError("AI case schedule not found", 404);
    }
    return res.json({
      success: true,
      message: "AI case review status updated",
      data: { schedule },
    });
  }
);

export const publishDueAICasePosts = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const dueSchedules = await AICasePostSchedule.find({
      isActive: true,
      reviewStatus: "approved",
      nextRunAt: { $lte: new Date() },
    }).limit(10);
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
            reason: "AI-generated scheduled case approved before publication",
            reviewedBy: schedule.reviewedBy,
            reviewedAt: schedule.reviewedAt ?? new Date(),
          },
        ],
        pointsAwarded: 0,
      });
      (schedule as any).publishedCase = publishedCase._id;
      schedule.lastPublishedAt = new Date();
      schedule.nextRunAt = getNextAICasePostDate(
        schedule.nextRunAt,
        schedule.interval
      );
      await schedule.save();
      published.push(publishedCase);
    }
    return res.json({
      success: true,
      message: "Due AI case drafts published",
      data: {
        count: published.length,
        cases: published,
      },
    });
  }
);

// Reply to a comment
export const replyToComment = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const user = req.user;
    const { caseId, commentId } = req.params;
    const { content } = req.body;
    if (!user) {
      throw new AppError("User not authenticated", 401);
    }
    if (!content || content.trim().length === 0) {
      throw new AppError("Reply content is required", 400);
    }
    const caseDoc = await Case.findById(getId(caseId));
    if (!caseDoc) {
      throw new AppError("Case not found", 404);
    }
    const parentComment = caseDoc.comments.find(
      (c: any) => c._id?.toString() === getId(commentId)
    );
    if (!parentComment) {
      throw new AppError("Comment not found", 404);
    }
    // Prevent duplicate replies
    if (
      caseDoc.comments.some(
        (c: any) =>
          c.author.toString() === user._id!.toString() &&
          c.content === content.trim() &&
          c.replyTo?.toString() === (parentComment as any)?._id?.toString()
      )
    ) {
      throw new AppError("Duplicate reply detected", 409);
    }
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
    // Send notification to comment author if not replying to own comment
    if (parentComment.author.toString() !== user._id!.toString()) {
      await Notification.create({
        recipient: parentComment.author,
        message: `Someone replied to your comment: "${parentComment.content}"`,
        type: "reply",
        link: `/cases/${caseId}`,
      });
    }
    res.status(201).json({
      success: true,
      message: "Reply added successfully",
      data: { reply },
    });
  }
);

// Like a comment
export const likeComment = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const user = req.user;
    const { caseId, commentId } = req.params;
    if (!user) {
      throw new AppError("User not authenticated", 401);
    }
    const userIdObj = new mongoose.Types.ObjectId(user._id!.toString());
    // Atomically toggle: try pull first (unlike)
    let liked = false;
    const pullResult = await Case.updateOne(
      { _id: getId(caseId), "comments._id": getId(commentId) },
      { $pull: { "comments.$.likes": userIdObj } }
    );
    if (pullResult.modifiedCount === 0) {
      // Not already liked, so add the like
      await Case.updateOne(
        { _id: getId(caseId), "comments._id": getId(commentId) },
        { $addToSet: { "comments.$.likes": userIdObj } }
      );
      liked = true;
    }
    // Fetch updated like count
    const updatedCase = await Case.findById(getId(caseId), {
      comments: { $elemMatch: { _id: getId(commentId) } },
    });
    const likes = ((updatedCase?.comments as any)?.[0]?.likes as any[])?.length ?? 0;
    res.json({
      success: true,
      message: liked ? "Comment liked" : "Comment unliked",
      data: { likes, liked },
    });
  }
);

// Rate a comment
export const rateComment = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const user = req.user;
    const { caseId, commentId } = req.params;
    const { rating } = req.body;
    if (!user) {
      throw new AppError("User not authenticated", 401);
    }
    if (!rating || rating < 1 || rating > 5) {
      throw new AppError("Rating must be between 1 and 5", 400);
    }
    // Verify case and comment exist
    const caseDoc = await Case.findById(getId(caseId), {
      comments: { $elemMatch: { _id: getId(commentId) } },
    });
    if (!caseDoc) {
      throw new AppError("Case not found", 404);
    }
    if (!(caseDoc.comments as any)?.[0]) {
      throw new AppError("Comment not found", 404);
    }
    const userIdObj = new mongoose.Types.ObjectId(user._id!.toString());
    const commentIdObj = new mongoose.Types.ObjectId(getId(commentId));
    // Use Rating model (unique compound index on {rater, commentId}) as source of truth
    const existingRating = await Rating.findOne({
      rater: userIdObj,
      commentId: commentIdObj,
    });

    let rated = false;
    if (existingRating) {
      // Unrate: remove the Rating document and denormalized reference
      await Rating.deleteOne({ _id: existingRating._id });
      await Case.updateOne(
        { _id: getId(caseId), "comments._id": getId(commentId) },
        { $pull: { "comments.$.ratedBy": userIdObj } }
      );
      rated = false;
    } else {
      // Rate: upsert with unique index guard against duplicates
      try {
        await Rating.create({
          rater: userIdObj,
          commentId: commentIdObj,
          caseId: new mongoose.Types.ObjectId(getId(caseId)),
          rating,
        });
      } catch (err: any) {
        if (err.code === 11000) {
          throw new AppError("Already rated this comment", 409);
        }
        throw err;
      }
      await Case.updateOne(
        { _id: getId(caseId), "comments._id": getId(commentId) },
        { $addToSet: { "comments.$.ratedBy": userIdObj } }
      );
      rated = true;
    }
    // Compute average rating via aggregation from the Rating collection
    const aggResult = await Rating.aggregate([
      { $match: { commentId: commentIdObj } },
      { $group: { _id: null, avg: { $avg: "$rating" }, count: { $sum: 1 } } },
    ]);
    const avgRating =
      aggResult.length > 0 ? Math.round(aggResult[0].avg) : undefined;
    const ratedByCount = aggResult.length > 0 ? aggResult[0].count : 0;
    // Update denormalized rating in comment
    await Case.updateOne(
      { _id: getId(caseId), "comments._id": getId(commentId) },
      { $set: { "comments.$.rating": avgRating ?? null } }
    );
    res.json({
      success: true,
      message: rated ? "Comment rated" : "Comment unrated",
      data: {
        rating: avgRating,
        ratedBy: ratedByCount,
        rated,
      },
    });
  }
);

// Upload a case attachment
export const uploadAttachment = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const user = req.user;
    if (!user) {
      throw new AppError("User not authenticated", 401);
    }
    if (!req.file) {
      throw new AppError("No file uploaded", 400);
    }
    const uploadResult = await uploadCaseAttachment(req.file, String(user._id));
    // Determine attachment type from resource_type or mimetype
    let type = 'image';
    if (uploadResult.resource_type === 'video') {
      if (req.file.mimetype.startsWith('audio/')) {
        type = 'audio';
      } else {
        type = 'video';
      }
    }
    res.status(201).json({
      success: true,
      message: "Attachment uploaded successfully",
      data: {
        url: uploadResult.secure_url,
        type,
        publicId: uploadResult.public_id,
      },
    });
  }
);

// Create a new case (Doctor only)
export const createCase = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const user = req.user;
    if (!user) {
      throw new AppError("User not authenticated", 401);
    }
    if (user.userType !== "doctor" && user.userType !== "patient") {
      throw new AppError("Only doctors and patients can create cases", 403);
    }
    const {
      title,
      description,
      patientInfo,
      images,
      attachments,
      specialization,
      isRareDisease,
      verifiedDoctorsOnly,
      tags,
      difficulty,
    } = req.body;
    let entities;
    try {
      entities = await extractEntities(description);
    }
    catch (error) {
      console.error("NER service failed:", error);
      const symptoms = extractSymptoms(description);
      entities = {
        entities: symptoms.map((symptom) => ({
          text: symptom,
          label: "SYMPTOM",
          score: 1,
          start: 0,
          end: 0,
        })),
      };
    }
    const spec = specialization || (user as any).specialization || "General Medicine";
    // Run the AI tagger
    const aiAnalysis = await analyzeCase(title, description, spec);
    // Restrict patient case creation
    if (user.userType === "patient") {
      // Patients can't set diagnosis, treatment, or difficulty
      // These will be limited or undefined
      const newCase = new Case({
        title,
        description,
        symptoms: req.body.symptoms?.length ? req.body.symptoms : aiAnalysis.symptoms,
        patientInfo: patientInfo || {},
        diagnosis: aiAnalysis.diagnosis,
        treatment: aiAnalysis.treatment,
        images: images || [],
        attachments: attachments || [],
        tags: req.body.tags?.length ? req.body.tags : aiAnalysis.tags,
        difficulty: aiAnalysis.difficulty,
        specialization: aiAnalysis.specialty || spec,
        doctor: user._id,
        isPatientCase: true,
        isRareDisease: isRareDisease === true,
        verifiedDoctorsOnly: verifiedDoctorsOnly === true,
        moderationStatus: req.body.isFlaggedForReview ? "pending" : "pending",
        moderationAuditTrail: [
          {
            status: "pending",
            reason: req.body.reviewReason || "Patient-submitted case awaiting review",
            reviewedAt: new Date(),
          },
        ],
      });
      await newCase.save();
      await newCase.populate("doctor", "firstName lastName");
      // Patients get fewer points for posting
      const pointsForCase = 5;
      await User.findByIdAndUpdate(user._id, {
        $inc: { points: pointsForCase },
      });
      return res.status(201).json({
        success: true,
        message: "Patient case created successfully",
        data: {
          case: newCase,
          pointsAwarded: pointsForCase,
        },
      });
    }

    // Doctor case creation (full features)
    const newCase = new Case({
      title,
      description,
      symptoms: req.body.symptoms?.length ? req.body.symptoms : aiAnalysis.symptoms,
      patientInfo: patientInfo || {},
      diagnosis: aiAnalysis.diagnosis,
      treatment: aiAnalysis.treatment,
      images: images || [],
      entities: entities.entities,
      specialization: specialization || user.specialization,
      attachments: attachments || [],
      tags: req.body.tags?.length ? req.body.tags : (aiAnalysis as any).tags,
      difficulty: req.body.difficulty || (aiAnalysis as any).difficulty,
      doctor: user._id,
      isPatientCase: false,
      isRareDisease: isRareDisease === true,
      verifiedDoctorsOnly: verifiedDoctorsOnly === true,
      moderationStatus: req.body.isFlaggedForReview ? "pending" : "approved",
      moderationAuditTrail: [
        {
          status: "approved",
          reason: "Doctor-authored case published automatically",
          reviewedBy: user._id,
          reviewedAt: new Date(),
        },
      ],
    } as any);

    const nc: any = newCase;
    const u: any = user;

    await nc.save();
    await nc.populate("doctor", "firstName lastName specialization");
    // Award points to doctor for posting case
    const pointsForCase = 10;
    await User.findByIdAndUpdate(u._id, { $inc: { points: pointsForCase } });
    await Case.findByIdAndUpdate(nc._id, { pointsAwarded: pointsForCase });
    
    // Trigger Automated Peer-Review Matching
    (async () => {
      try {
        const targetSpec = (aiAnalysis as any).specialty || spec;
        const userObjId = mongoose.Types.ObjectId.isValid((u._id as any)?.toString())
          ? new mongoose.Types.ObjectId((u._id as any)?.toString())
          : u._id;
        const matchedSpecialists = await User.aggregate([
          {
            $match: {
              isVerifiedDoctor: true,
              specialization: targetSpec,
              _id: { $ne: userObjId }
            }
          },
          { $sample: { size: 5 } }
        ]);
        const specialistsList = Array.isArray(matchedSpecialists) ? matchedSpecialists : [];
        for (const specialist of specialistsList) {
          await createAndEmitNotification({
            recipientId: specialist._id.toString(),
            type: 'peer_review',
            message: `A new ${targetSpec} case requires peer review. Your expertise is requested!`,
            link: `/cases/${nc._id}`
          });
        }
      } catch (err) {
        console.error("Failed to execute peer-review matching:", err);
      }
    })();

    res.status(201).json({
      success: true,
      message: "Case created successfully",
      data: {
        case: nc,
        pointsAwarded: pointsForCase,
      },
    });
  }
);