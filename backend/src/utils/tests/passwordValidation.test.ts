import { isValidPassword, PASSWORD_REGEX, PASSWORD_VALIDATION_MESSAGE } from "../passwordValidation";

describe("isValidPassword", () => {
  it("accepts a valid strong password", () => {
    expect(isValidPassword("Test@1234")).toBe(true);
  });

  it("rejects password shorter than 8 characters", () => {
    expect(isValidPassword("Ab1!")).toBe(false);
  });

  it("rejects password without uppercase letter", () => {
    expect(isValidPassword("lowercase1!")).toBe(false);
  });

  it("rejects password without lowercase letter", () => {
    expect(isValidPassword("UPPERCASE1!")).toBe(false);
  });

  it("rejects password without digit", () => {
    expect(isValidPassword("NoDigitHere!")).toBe(false);
  });

  it("rejects password without special character", () => {
    expect(isValidPassword("NoSpecial1A")).toBe(false);
  });

  it("accepts password at exactly 8 characters with all required classes", () => {
    expect(isValidPassword("Abc@1234")).toBe(true);
  });

  it("rejects empty string", () => {
    expect(isValidPassword("")).toBe(false);
  });
});

describe("PASSWORD_REGEX", () => {
  it("is a valid RegExp", () => {
    expect(PASSWORD_REGEX).toBeInstanceOf(RegExp);
  });
});

describe("PASSWORD_VALIDATION_MESSAGE", () => {
  it("is a non-empty string describing password requirements", () => {
    expect(typeof PASSWORD_VALIDATION_MESSAGE).toBe("string");
    expect(PASSWORD_VALIDATION_MESSAGE.length).toBeGreaterThan(0);
    expect(PASSWORD_VALIDATION_MESSAGE).toContain("8 characters");
  });
});
