import express from "express";
import {
  generateAutomatedCaseDraft,
  getAutomatedCaseDrafts,
  publishAutomatedDraft,
  publishDueAutomatedDrafts,
  reviewAutomatedDraft,
} from "../controllers/automatedCaseController";
import { authenticate } from "../middleware/auth";

const router = express.Router();

router.get("/drafts", authenticate, getAutomatedCaseDrafts);
router.post("/drafts", authenticate, generateAutomatedCaseDraft);
router.post("/drafts/publish-due", authenticate, publishDueAutomatedDrafts);
router.patch("/drafts/:id/review", authenticate, reviewAutomatedDraft);
router.post("/drafts/:id/publish", authenticate, publishAutomatedDraft);

export default router;
