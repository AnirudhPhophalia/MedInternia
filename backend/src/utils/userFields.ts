/**
 * Safe user fields for population queries
 * Issue #996: Ensures sensitive fields like password/passwordHash are never exposed
 * during Mongoose populate() operations
 *
 * Issue #1052: Additional fixes
 * - Removed `email` from public-facing constants (PII — enables harvesting)
 * - Replaced `profilePicturePublicId` with `profilePicture` in public constants
 *   (publicId is a Cloudinary internal asset ID, not a display URL)
 * - Removed `medicalHistory` and `allergies` from PATIENT_FIELDS
 *   (medical PII must never appear in shared populate queries)
 * - Added USER_FIELDS_WITH_EMAIL for the rare cases where email is needed
 */

// Fields safe to expose in API responses when populating User references.
// Email intentionally excluded — use USER_FIELDS_WITH_EMAIL when email is
// required for a specific, justified purpose (e.g. sending the user their
// own notification).
export const SAFE_USER_FIELDS = 'firstName lastName userType specialization profilePicture isVerifiedDoctor';

// Common fields for user references in API responses
export const USER_PUBLIC_FIELDS = 'firstName lastName userType specialization isVerifiedDoctor profilePicture';

// Minimal user fields (name and ID only)
export const USER_MINIMAL_FIELDS = 'firstName lastName';

// Detailed user fields for profile endpoints (own-user context only)
export const USER_PROFILE_FIELDS = 'firstName lastName email userType specialization bio profilePicture medicalSchool yearOfStudy experience qualifications isVerifiedDoctor';

// Doctor-specific safe fields
export const DOCTOR_FIELDS = 'firstName lastName specialization experience qualifications isVerifiedDoctor profilePicture';

// Patient-specific safe fields for populate queries in shared responses.
// medicalHistory and allergies are intentionally excluded — these are sensitive
// medical PII that must never appear in responses visible to other users
// (e.g. doctors browsing appointments or cases).
export const PATIENT_FIELDS = 'firstName lastName profilePicture';

// Use this only when email is explicitly required (e.g. own-user context,
// internal notifications). Never use in responses visible to other users.
export const USER_FIELDS_WITH_EMAIL = 'firstName lastName email userType specialization profilePicture isVerifiedDoctor';

// Never include these fields in any response
export const RESTRICTED_USER_FIELDS = [
  'password',
  'passwordHash',
  'passwordResetToken',
  'passwordResetExpires',
  'passwordChangedAt',
  'lockoutUntil',
  'loginAttempts',
  'medicalHistory',
  'allergies',
  'profilePicturePublicId',
];

/**
 * Validates that a field list doesn't include restricted fields
 * Prevents accidental exposure of sensitive data
 */
export const validateUserFields = (fields: string): boolean => {
  const fieldArray = fields.split(' ').filter(f => f.length > 0);
  return !fieldArray.some(field => RESTRICTED_USER_FIELDS.includes(field));
};

/**
 * Ensures that fields being selected exclude all restricted fields
 * Useful as a safety check when dynamically building field selections
 */
export const sanitizeUserFields = (fields: string): string => {
  const fieldArray = fields.split(' ').filter(f => f.length > 0);
  const safeFields = fieldArray.filter(field => !RESTRICTED_USER_FIELDS.includes(field));
  return safeFields.join(' ');
};
