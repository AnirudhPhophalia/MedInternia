/**
 * Safe user fields for population queries
 * Issue #996: Ensures sensitive fields like password/passwordHash are never exposed
 * during Mongoose populate() operations
 *
 * Issue #1052 / #1230: Additional fixes
 * - Removed `email` from public-facing constants (PII — enables harvesting)
 * - Select `profilePicturePublicId` for populate (schema field). Callers should
 *   resolve/signed-map to `profilePicture` and strip the publicId before responding.
 * - Removed `medicalHistory` and `allergies` from PATIENT_FIELDS
 * - Added USER_FIELDS_WITH_EMAIL for the rare cases where email is needed
 */

// Fields safe to expose in API responses when populating User references.
// Email intentionally excluded — use USER_FIELDS_WITH_EMAIL when email is
// required for a specific, justified purpose (e.g. sending the user their
// own notification).
export const SAFE_USER_FIELDS = 'firstName lastName userType specialization profilePicturePublicId isVerifiedDoctor';

// Common fields for user references in API responses
export const USER_PUBLIC_FIELDS = 'firstName lastName userType specialization isVerifiedDoctor profilePicturePublicId';

// Minimal user fields (name and ID only)
export const USER_MINIMAL_FIELDS = 'firstName lastName';

// Detailed user fields for profile endpoints (own-user context only)
export const USER_PROFILE_FIELDS = 'firstName lastName email userType specialization bio profilePicturePublicId medicalSchool yearOfStudy experience qualifications isVerifiedDoctor';

// Doctor-specific safe fields
export const DOCTOR_FIELDS = 'firstName lastName specialization experience qualifications isVerifiedDoctor profilePicturePublicId';

// Patient-specific safe fields for populate queries in shared responses.
// medicalHistory and allergies are intentionally excluded — these are sensitive
// medical PII that must never appear in responses visible to other users
// (e.g. doctors browsing appointments or cases).
export const PATIENT_FIELDS = 'firstName lastName profilePicturePublicId';

// Use this only when email is explicitly required (e.g. own-user context,
// internal notifications). Never use in responses visible to other users.
export const USER_FIELDS_WITH_EMAIL = 'firstName lastName email userType specialization profilePicturePublicId isVerifiedDoctor';

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
  // profilePicturePublicId is selectable for populate/resolution, but User.toJSON
  // strips it and replaces with a signed profilePicture URL (Issue #1230).
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
