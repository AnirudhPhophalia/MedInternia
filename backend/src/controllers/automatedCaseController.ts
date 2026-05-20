import { Response } from "express";
import AutomatedCaseDraft from "../models/AutomatedCaseDraft";
import { AuthRequest } from "../middleware/auth";
import {
  createAutomatedCaseDraft,
  publishAutomatedCaseDraft,
  publishDueAutomatedCaseDrafts,
  reviewAutomatedCaseDraft,
} from "../services/automatedCaseService";

const getDoctorUser = (req: AuthRequest) =>
  req.user as
    | {
        _id: string;
        userType: string;
        specialization?: string;
      }
    | undefined;

export const generateAutomatedCaseDraft = async (
  req: AuthRequest,
  res: Response,
) => {
  try {
    const user = getDoctorUser(req);
    if (!user) {
      return res
        .status(401)
        .json({ success: false, message: "User not authenticated" });
    }

    const draft = await createAutomatedCaseDraft(user, req.body);

    res.status(201).json({
      success: true,
      message: "Automated case draft generated for review",
      data: { draft },
    });
  } catch (error: any) {
    const message = error.message || "Failed to generate automated case draft";
    const status = message.includes("Only doctors") ? 403 : 400;
    res.status(status).json({ success: false, message });
  }
};

export const getAutomatedCaseDrafts = async (
  req: AuthRequest,
  res: Response,
) => {
  try {
    const user = getDoctorUser(req);
    if (!user) {
      return res
        .status(401)
        .json({ success: false, message: "User not authenticated" });
    }

    const { status, page = 1, limit = 10 } = req.query;
    const pageNum = Math.max(parseInt(page as string, 10) || 1, 1);
    const limitNum = Math.min(
      Math.max(parseInt(limit as string, 10) || 10, 1),
      50,
    );
    const filter: Record<string, unknown> = { createdBy: user._id };

    if (status) {
      filter.status = status;
    }

    const [drafts, total] = await Promise.all([
      AutomatedCaseDraft.find(filter)
        .populate("sourceCase", "title specialization difficulty")
        .populate("publishedCase", "title")
        .sort({ scheduledFor: 1, createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum),
      AutomatedCaseDraft.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: {
        drafts,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const reviewAutomatedDraft = async (req: AuthRequest, res: Response) => {
  try {
    const user = getDoctorUser(req);
    if (!user) {
      return res
        .status(401)
        .json({ success: false, message: "User not authenticated" });
    }

    const draft = await reviewAutomatedCaseDraft(req.params.id, user, req.body);
    if (!draft) {
      return res
        .status(404)
        .json({ success: false, message: "Draft not found" });
    }

    res.json({
      success: true,
      message: "Automated case draft review updated",
      data: { draft },
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message || "Failed to review automated case draft",
    });
  }
};

export const publishAutomatedDraft = async (
  req: AuthRequest,
  res: Response,
) => {
  try {
    const user = getDoctorUser(req);
    if (!user) {
      return res
        .status(401)
        .json({ success: false, message: "User not authenticated" });
    }

    const result = await publishAutomatedCaseDraft(req.params.id, user);
    if (!result) {
      return res
        .status(404)
        .json({ success: false, message: "Draft not found" });
    }

    res.status(201).json({
      success: true,
      message: "Approved automated draft published as a case",
      data: result,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message || "Failed to publish automated case draft",
    });
  }
};

export const publishDueAutomatedDrafts = async (
  req: AuthRequest,
  res: Response,
) => {
  try {
    const user = getDoctorUser(req);
    if (!user) {
      return res
        .status(401)
        .json({ success: false, message: "User not authenticated" });
    }

    const limit =
      typeof req.body?.limit === "number" ? (req.body.limit as number) : 5;
    const published = await publishDueAutomatedCaseDrafts(user, limit);

    res.json({
      success: true,
      message: "Due automated drafts published",
      data: {
        published,
        count: published.length,
      },
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message || "Failed to publish due automated drafts",
    });
  }
};
