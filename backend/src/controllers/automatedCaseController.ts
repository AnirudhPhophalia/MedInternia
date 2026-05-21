import { Response } from "express";
import Case from "../models/Case";
import User from "../models/User";
import { AuthRequest } from "../middleware/auth";
import {
  buildAutomatedCaseDraft,
  parseGeneratedCaseInput,
} from "../services/automatedCasePostingService";

const GENERATED_CASE_POINTS = 10;

const getDoctorUser = (req: AuthRequest) => {
  const user = req.user;
  if (!user || user.userType !== "doctor") {
    return null;
  }
  return user;
};

const toIdString = (value: unknown): string => String(value);

const publishCaseIfDue = async (caseId: string, doctorId: string) => {
  const now = new Date();
  const caseData = await Case.findOne({
    _id: caseId,
    doctor: doctorId,
    aiGenerated: true,
    reviewStatus: "approved",
    scheduledFor: { $lte: now },
  });

  if (!caseData) return null;

  caseData.reviewStatus = "published";
  caseData.isActive = true;
  caseData.publishedAt = now;

  if (caseData.pointsAwarded === 0) {
    caseData.pointsAwarded = GENERATED_CASE_POINTS;
    await User.findByIdAndUpdate(doctorId, {
      $inc: { points: GENERATED_CASE_POINTS },
    });
  }

  await caseData.save();
  return caseData;
};

export const createAutomatedCaseDraft = async (
  req: AuthRequest,
  res: Response,
) => {
  try {
    const user = getDoctorUser(req);
    if (!user) {
      return res.status(403).json({
        success: false,
        message: "Only doctors can create AI-assisted case drafts",
      });
    }

    const input = parseGeneratedCaseInput(req.body);
    const draft = buildAutomatedCaseDraft(input);

    const caseData = await Case.create({
      ...draft,
      doctor: user._id,
      isActive: false,
      isPatientCase: false,
      aiGenerated: true,
      generationSource: "deterministic-template",
      reviewStatus: "pending_review",
      pointsAwarded: 0,
      canRepost: false,
    });

    await caseData.populate("doctor", "firstName lastName specialization");

    return res.status(201).json({
      success: true,
      message: "AI-assisted case draft generated and queued for review",
      data: {
        case: caseData,
        reviewChecklist: draft.reviewChecklist,
      },
    });
  } catch (error) {
    console.error("Create automated case draft error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const getAutomatedCaseDrafts = async (
  req: AuthRequest,
  res: Response,
) => {
  try {
    const user = getDoctorUser(req);
    if (!user) {
      return res.status(403).json({
        success: false,
        message: "Only doctors can view AI-assisted case drafts",
      });
    }

    const cases = await Case.find({
      doctor: user._id,
      aiGenerated: true,
    })
      .populate("doctor", "firstName lastName specialization")
      .sort({ scheduledFor: 1, createdAt: -1 });

    return res.json({
      success: true,
      data: {
        cases,
        total: cases.length,
      },
    });
  } catch (error) {
    console.error("Get automated case drafts error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const approveAutomatedCaseDraft = async (
  req: AuthRequest,
  res: Response,
) => {
  try {
    const user = getDoctorUser(req);
    if (!user) {
      return res.status(403).json({
        success: false,
        message: "Only doctors can approve AI-assisted case drafts",
      });
    }

    const caseData = await Case.findOne({
      _id: req.params.id,
      doctor: user._id,
      aiGenerated: true,
    });

    if (!caseData) {
      return res.status(404).json({
        success: false,
        message: "AI-assisted case draft not found",
      });
    }

    if (caseData.reviewStatus === "rejected") {
      return res.status(400).json({
        success: false,
        message: "Rejected drafts must be regenerated before approval",
      });
    }

    caseData.reviewStatus = "approved";
    caseData.isActive = false;
    await caseData.save();

    const publishedCase = await publishCaseIfDue(
      toIdString(caseData._id),
      toIdString(user._id),
    );
    const responseCase = publishedCase ?? caseData;

    return res.json({
      success: true,
      message:
        responseCase.reviewStatus === "published"
          ? "AI-assisted case approved and published"
          : "AI-assisted case approved and scheduled for posting",
      data: {
        case: responseCase,
      },
    });
  } catch (error) {
    console.error("Approve automated case draft error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const rejectAutomatedCaseDraft = async (
  req: AuthRequest,
  res: Response,
) => {
  try {
    const user = getDoctorUser(req);
    if (!user) {
      return res.status(403).json({
        success: false,
        message: "Only doctors can reject AI-assisted case drafts",
      });
    }

    const caseData = await Case.findOneAndUpdate(
      {
        _id: req.params.id,
        doctor: user._id,
        aiGenerated: true,
      },
      {
        reviewStatus: "rejected",
        isActive: false,
      },
      { new: true },
    );

    if (!caseData) {
      return res.status(404).json({
        success: false,
        message: "AI-assisted case draft not found",
      });
    }

    return res.json({
      success: true,
      message: "AI-assisted case draft rejected",
      data: {
        case: caseData,
      },
    });
  } catch (error) {
    console.error("Reject automated case draft error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const publishDueAutomatedCases = async (
  req: AuthRequest,
  res: Response,
) => {
  try {
    const user = getDoctorUser(req);
    if (!user) {
      return res.status(403).json({
        success: false,
        message: "Only doctors can publish scheduled AI-assisted cases",
      });
    }

    const dueCases = await Case.find({
      doctor: user._id,
      aiGenerated: true,
      reviewStatus: "approved",
      scheduledFor: { $lte: new Date() },
    }).select("_id");

    const publishedCases = [];
    for (const dueCase of dueCases) {
      const publishedCase = await publishCaseIfDue(
        toIdString(dueCase._id),
        toIdString(user._id),
      );
      if (publishedCase) {
        publishedCases.push(publishedCase);
      }
    }

    return res.json({
      success: true,
      message: "Scheduled AI-assisted cases processed",
      data: {
        published: publishedCases.length,
        cases: publishedCases,
      },
    });
  } catch (error) {
    console.error("Publish due automated cases error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
