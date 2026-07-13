import { Request, Response } from "express";
import { extractSymptomsFromText } from "../symptomExtractionController";
import { extractSymptomMatches } from "../../services/symptomExtractionService";

jest.mock("../../services/symptomExtractionService");

const mockedExtract = extractSymptomMatches as jest.Mock;

const mockResponse = () => {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res as Response;
};

describe("Symptom Extraction Controller", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("extractSymptomsFromText", () => {
    it("returns 400 if text is not a string", () => {
      const req = { body: { text: 123 } } as Request;
      const res = mockResponse();

      extractSymptomsFromText(req, res as any);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: "Text must be provided as a string" }));
    });

    it("returns 400 if text is empty whitespace", () => {
      const req = { body: { text: "   " } } as Request;
      const res = mockResponse();

      extractSymptomsFromText(req, res as any);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("returns 413 if text exceeds 10000 characters limit", () => {
      const req = { body: { text: "a".repeat(10001) } } as Request;
      const res = mockResponse();

      extractSymptomsFromText(req, res as any);

      expect(res.status).toHaveBeenCalledWith(413);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining("Text cannot exceed") }));
    });

    it("extracts symptoms successfully on valid payload", () => {
      const req = { body: { text: "Patient has high fever and cough." } } as Request;
      const res = mockResponse();

      mockedExtract.mockReturnValue([{ symptom: "fever" }, { symptom: "cough" }]);

      extractSymptomsFromText(req, res as any);

      expect(mockedExtract).toHaveBeenCalledWith("Patient has high fever and cough.");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            symptoms: ["fever", "cough"],
          }),
        })
      );
    });
  });
});
