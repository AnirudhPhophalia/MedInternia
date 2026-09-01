import { scoreCaseComplexity } from "../caseComplexity";

describe("scoreCaseComplexity", () => {
  it("scores an empty case as zero / beginner", () => {
    const r = scoreCaseComplexity({});
    expect(r.score).toBe(0);
    expect(r.suggestedDifficulty).toBe("beginner");
  });

  it("clamps a maximal case to 100 / advanced", () => {
    const r = scoreCaseComplexity({
      symptoms: Array(12).fill("s"), // capped at 8 -> 48
      patientInfo: {
        age: 1, // 12
        medicalHistory: Array(8).fill("h"), // capped 6 -> 30
        currentMedications: Array(8).fill("m"), // capped 6 -> 24
      },
      isRareDisease: true, // 15
      attachments: Array(6).fill({ url: "x" }), // capped 4 -> 12
    });
    expect(r.score).toBe(100);
    expect(r.suggestedDifficulty).toBe("advanced");
  });

  it("computes an intermediate score with an exact factor breakdown", () => {
    const r = scoreCaseComplexity({
      symptoms: ["a", "b", "c"], // 18
      patientInfo: {
        age: 55, // 5
        medicalHistory: ["htn"], // 5
        currentMedications: ["metformin"], // 4
      },
      attachments: [{ url: "x" }], // 3
    });
    // 18 + 5 + 5 + 4 + 0 + 3 = 35
    expect(r.score).toBe(35);
    expect(r.suggestedDifficulty).toBe("intermediate");
    expect(r.factors).toEqual({
      symptoms: 18,
      comorbidities: 5,
      medications: 4,
      ageRisk: 5,
      rareDisease: 0,
      attachments: 3,
    });
  });

  it("caps individual factors and never exceeds bounds", () => {
    const r = scoreCaseComplexity({ symptoms: Array(50).fill("s") });
    expect(r.factors.symptoms).toBe(48); // 8 * 6, not 50 * 6
    expect(r.score).toBeLessThanOrEqual(100);
    expect(r.score).toBeGreaterThanOrEqual(0);
  });

  it("tolerates undefined patientInfo and symptoms", () => {
    const r = scoreCaseComplexity({ isRareDisease: true });
    expect(r.factors.rareDisease).toBe(15);
    expect(r.factors.ageRisk).toBe(0);
    expect(r.score).toBe(15);
  });
});
