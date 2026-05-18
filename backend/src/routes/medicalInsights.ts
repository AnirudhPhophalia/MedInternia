import { Router, Response } from "express";
import { AuthRequest, authenticate } from "../middleware/auth";
import { generateMedicalInsight } from "../services/medicalInsightService";

const router = Router();

router.post(
  "/predict",
  authenticate,
  async (req: AuthRequest, res: Response) => {
    try {
      const { symptoms, patientContext, notes } = req.body ?? {};

      if (!Array.isArray(symptoms)) {
        return res.status(400).json({
          success: false,
          message: "symptoms must be an array of strings",
        });
      }

      const insight = await generateMedicalInsight({
        symptoms: symptoms.map(String),
        patientContext,
        notes: typeof notes === "string" ? notes : undefined,
      });

      return res.json({
        success: true,
        data: insight,
      });
    } catch (error) {
      console.error("Medical insight prediction error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to generate medical insight",
      });
    }
  },
);

export default router;
