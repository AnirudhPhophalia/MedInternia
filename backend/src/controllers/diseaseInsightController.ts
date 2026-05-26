import { Request, Response } from 'express';
import { predictDiseaseInsights, validatePredictionInput } from '../services/diseaseInsightService';

export const predictDiseaseInsightsHandler = async (req: Request, res: Response) => {
  try {
    const input = validatePredictionInput(req.body);
    const predictions = predictDiseaseInsights(input);

    return res.json({
      success: true,
      data: {
        input,
        predictions,
        disclaimer:
          'This assistant supports medical education and triage thinking only. It is not a diagnosis and must be reviewed by a qualified clinician.',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid prediction request';
    return res.status(400).json({
      success: false,
      message,
    });
  }
};
