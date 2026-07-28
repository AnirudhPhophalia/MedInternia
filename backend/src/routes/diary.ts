import { Router } from "express";
import { authenticate } from "../middleware/auth";
import {
  getDiaries,
  createDiary,
  addDiaryEntry,
} from "../controllers/diaryController";

const router = Router();

// Get all diaries
router.get("/", authenticate, getDiaries);

// Create a new diary
router.post("/", authenticate, createDiary);

// Add entry to a diary
router.post("/:diaryId/entries", authenticate, addDiaryEntry);

export default router;
