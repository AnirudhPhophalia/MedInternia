/**
 * Shared password validation rules.
 *
 * Used by:
 *   - User model (Mongoose validator)
 *   - authController  (changePassword / resetPassword pre-save checks)
 */

export const PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>]).{8,}$/;

export const PASSWORD_VALIDATION_MESSAGE =
  'Password must be at least 8 characters and contain uppercase, lowercase, digit, and special character';

export const isValidPassword = (password: string): boolean =>
  PASSWORD_REGEX.test(password);
