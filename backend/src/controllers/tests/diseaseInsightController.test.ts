import { Request, Response } from "express";
import { predictDiseaseInsightsHandler } from "../diseaseInsightController";
import { predictDiseaseInsights, validatePredictionInput } from "../../services/diseaseInsightService";

jest.mock("../../services/diseaseInsightService");

const mockedValidate = validatePredictionInput as jest.Mock;
const mockedPredict = predictDiseaseInsights as jest.Mock;

const mockResponse = () => {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res as Response;
};

describe("Disease Insight Controller", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("predictDiseaseInsightsHandler", () => {
    it("returns predictions on successful service call", async () => {
      const req = { body: { age: 30, symptoms: ["fever"] } } as Request;
      const res = mockResponse();

      mockedValidate.mockReturnValue({ age: 30, symptoms: ["fever"] });
      mockedPredict.mockReturnValue(["Dengue", "Malaria"]);

      await predictDiseaseInsightsHandler(req, res as any);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            predictions: ["Dengue", "Malaria"],
          }),
        })
      );
    });

    it("returns 400 when validation throws an error", async () => {
      const req = { body: { age: -5 } } as Request;
      const res = mockResponse();

      mockedValidate.mockImplementation(() => {
        throw new Error("Invalid age");
      });

      await predictDiseaseInsightsHandler(req, res as any);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "Invalid age",
        })
      );
    });
  });
});
