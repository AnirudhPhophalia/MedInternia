/**
 * Safe user fields for population queries
 * Issue #996: Ensures sensitive fields like password/passwordHash are never exposed
 * during Mongoose populate() operations
 */

// Fields safe to expose in API responses when populating User references
export const SAFE_USER_FIELDS = 'firstName lastName email userType specialization avatar isVerifiedDoctor profilePicturePublicId';

// Common fields for user references in API responses
export const USER_PUBLIC_FIELDS = 'firstName lastName userType specialization isVerifiedDoctor profilePicturePublicId';

// Minimal user fields (name and ID only)
export const USER_MINIMAL_FIELDS = 'firstName lastName';

// Detailed user fields for profile endpoints
export const USER_PROFILE_FIELDS = 'firstName lastName email userType specialization bio profilePicturePublicId medicalSchool yearOfStudy experience qualifications isVerifiedDoctor';

// Doctor-specific safe fields
export const DOCTOR_FIELDS = 'firstName lastName specialization experience qualifications isVerifiedDoctor profilePicturePublicId';

// Patient-specific safe fields
export const PATIENT_FIELDS = 'firstName lastName email profilePicturePublicId medicalHistory allergies';

// Never include these fields in any response
export const RESTRICTED_USER_FIELDS = ['password', 'passwordHash', 'passwordResetToken', 'passwordResetExpires', 'passwordChangedAt', 'lockoutUntil', 'loginAttempts'];

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
