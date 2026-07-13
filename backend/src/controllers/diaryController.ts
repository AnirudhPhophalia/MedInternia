import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import Diary from "../models/Diary";

// Get all diaries of the logged-in user
export const getDiaries = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    const diaries = await Diary.find({
      user: req.user._id,
    }).sort({ createdAt: -1 });

    return res.status(200).json(diaries);
  } catch (error) {
    console.error("Error fetching diaries:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch diaries.",
    });
  }
};

// Create a new diary
export const createDiary = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    const { title } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: "Diary title is required.",
      });
    }

    const diary = await Diary.create({
      title: title.trim(),
      user: req.user._id,
      entries: [],
    });

    return res.status(201).json(diary);
  } catch (error) {
    console.error("Error creating diary:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create diary.",
    });
  }
};

// Add an entry to an existing diary
export const addDiaryEntry = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

   const { diaryId } = req.params;
    const {
      day,
      content,
      time,
      location,
      diseaseDescription,
      symptoms,
      doctorReference,
      imageUrl,
      dataSource,
      gender,
      tags,
      symptomsChecklist,
    } = req.body;

    if (!day || !content) {
      return res.status(400).json({
        success: false,
        message: "Day and content are required.",
      });
    }

    const diary = await Diary.findOne({
      _id: diaryId,
      user: req.user._id,
    });

    if (!diary) {
      return res.status(404).json({
        success: false,
        message: "Diary not found.",
      });
    }

    diary.entries.push({
      day,
      content,
      time,
      location,
      diseaseDescription,
      symptoms,
      doctorReference,
      imageUrl,
      dataSource,
      gender,
      tags,
      symptomsChecklist,
    });

    await diary.save();

    return res.status(200).json(diary);
  } catch (error) {
    console.error("Error adding diary entry:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to add diary entry.",
    });
  }
};