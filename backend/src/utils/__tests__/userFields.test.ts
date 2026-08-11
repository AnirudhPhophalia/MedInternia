import {
  SAFE_USER_FIELDS,
  USER_PUBLIC_FIELDS,
  USER_MINIMAL_FIELDS,
  DOCTOR_FIELDS,
  PATIENT_FIELDS,
  USER_FIELDS_WITH_EMAIL,
  RESTRICTED_USER_FIELDS,
  validateUserFields,
  sanitizeUserFields
} from '../userFields';

/**
 * Tests for Issue #996: User field sanitization for populate() operations
 * Ensures passwordHash and other sensitive fields are never exposed
 */

describe('User Fields Sanitization (Issue #996)', () => {
  describe('Safe Field Constants', () => {
    it('should define safe fields for user population', () => {
      expect(SAFE_USER_FIELDS).toBeDefined();
      expect(typeof SAFE_USER_FIELDS).toBe('string');
      expect(SAFE_USER_FIELDS.length).toBeGreaterThan(0);
    });

    it('should define public fields for API responses', () => {
      expect(USER_PUBLIC_FIELDS).toBeDefined();
      const fields = USER_PUBLIC_FIELDS.split(' ');
      // Should include essential fields
      expect(fields).toContain('firstName');
      expect(fields).toContain('lastName');
      expect(fields).toContain('userType');
    });

    it('should define minimal fields for references', () => {
      expect(USER_MINIMAL_FIELDS).toBeDefined();
      const fields = USER_MINIMAL_FIELDS.split(' ');
      expect(fields).toContain('firstName');
      expect(fields).toContain('lastName');
    });

    it('should define doctor-specific fields', () => {
      expect(DOCTOR_FIELDS).toBeDefined();
      const fields = DOCTOR_FIELDS.split(' ');
      expect(fields).toContain('specialization');
      expect(fields).toContain('isVerifiedDoctor');
    });

    it('should define patient-specific fields', () => {
      expect(PATIENT_FIELDS).toBeDefined();
      const fields = PATIENT_FIELDS.split(' ');
      expect(fields).toContain('firstName');
      expect(fields).toContain('lastName');
      // Issue #1052: email and medical PII must NOT be in the shared patient constant
      expect(fields).not.toContain('email');
      expect(fields).not.toContain('medicalHistory');
      expect(fields).not.toContain('allergies');
    });

    it('should define USER_FIELDS_WITH_EMAIL for own-user contexts only', () => {
      expect(USER_FIELDS_WITH_EMAIL).toBeDefined();
      const fields = USER_FIELDS_WITH_EMAIL.split(' ');
      expect(fields).toContain('email');
      expect(fields).toContain('firstName');
    });
  });

  describe('Restricted Fields', () => {
    it('should list all password-related fields as restricted', () => {
      expect(RESTRICTED_USER_FIELDS).toContain('password');
      expect(RESTRICTED_USER_FIELDS).toContain('passwordHash');
      expect(RESTRICTED_USER_FIELDS).toContain('passwordResetToken');
      expect(RESTRICTED_USER_FIELDS).toContain('passwordResetExpires');
      expect(RESTRICTED_USER_FIELDS).toContain('passwordChangedAt');
    });

    it('should restrict security-sensitive fields', () => {
      expect(RESTRICTED_USER_FIELDS).toContain('lockoutUntil');
      expect(RESTRICTED_USER_FIELDS).toContain('loginAttempts');
    });

    it('should restrict medical PII fields (Issue #1052)', () => {
      expect(RESTRICTED_USER_FIELDS).toContain('medicalHistory');
      expect(RESTRICTED_USER_FIELDS).toContain('allergies');
    });

    it('should restrict Cloudinary internal asset ID (Issue #1052)', () => {
      expect(RESTRICTED_USER_FIELDS).toContain('profilePicturePublicId');
    });

    it('should not have duplicate restricted fields', () => {
      const uniqueFields = new Set(RESTRICTED_USER_FIELDS);
      expect(uniqueFields.size).toBe(RESTRICTED_USER_FIELDS.length);
    });
  });

  describe('Field Validation', () => {
    it('should validate safe field lists', () => {
      expect(validateUserFields(SAFE_USER_FIELDS)).toBe(true);
      expect(validateUserFields(USER_PUBLIC_FIELDS)).toBe(true);
      expect(validateUserFields(DOCTOR_FIELDS)).toBe(true);
      expect(validateUserFields(PATIENT_FIELDS)).toBe(true);
    });

    it('should reject fields containing password', () => {
      expect(validateUserFields('firstName lastName password')).toBe(false);
      expect(validateUserFields('firstName lastName email passwordHash')).toBe(false);
    });

    it('should reject fields containing passwordResetToken', () => {
      expect(validateUserFields('firstName passwordResetToken')).toBe(false);
    });

    it('should reject fields containing lockoutUntil', () => {
      expect(validateUserFields('firstName lastName lockoutUntil')).toBe(false);
    });

    it('should reject fields containing loginAttempts', () => {
      expect(validateUserFields('firstName loginAttempts')).toBe(false);
    });

    it('should handle empty field strings', () => {
      expect(validateUserFields('')).toBe(true);
      expect(validateUserFields('   ')).toBe(true);
    });
  });

  describe('Field Sanitization', () => {
    it('should remove restricted fields from field lists', () => {
      const result = sanitizeUserFields('firstName lastName password');
      const fields = result.split(' ').filter(f => f.length > 0);

      expect(fields).toContain('firstName');
      expect(fields).toContain('lastName');
      expect(fields).not.toContain('password');
    });

    it('should remove multiple restricted fields', () => {
      const result = sanitizeUserFields('firstName password email passwordHash');
      const fields = result.split(' ').filter(f => f.length > 0);

      expect(fields).toContain('firstName');
      expect(fields).toContain('email');
      expect(fields).not.toContain('password');
      expect(fields).not.toContain('passwordHash');
    });

    it('should handle already safe field lists', () => {
      const result = sanitizeUserFields(DOCTOR_FIELDS);
      expect(validateUserFields(result)).toBe(true);
    });

    it('should preserve field order', () => {
      const fields = 'firstName lastName email specialization';
      const result = sanitizeUserFields(fields);

      expect(result).toBe(fields);
    });

    it('should handle multiple spaces', () => {
      const result = sanitizeUserFields('firstName  lastName   email');
      const fields = result.split(' ').filter(f => f.length > 0);

      expect(fields.length).toBe(3);
      expect(fields[0]).toBe('firstName');
    });

    it('should remove passwordChangedAt field', () => {
      const result = sanitizeUserFields('firstName passwordChangedAt lastName');
      const fields = result.split(' ').filter(f => f.length > 0);

      expect(fields).not.toContain('passwordChangedAt');
    });

    it('should remove passwordResetExpires field', () => {
      const result = sanitizeUserFields('firstName passwordResetExpires lastName');
      const fields = result.split(' ').filter(f => f.length > 0);

      expect(fields).not.toContain('passwordResetExpires');
    });
  });

  describe('Security: No Password Exposure', () => {
    it('should never expose password in any field set', () => {
      const allFieldSets = [
        SAFE_USER_FIELDS,
        USER_PUBLIC_FIELDS,
        USER_MINIMAL_FIELDS,
        DOCTOR_FIELDS,
        PATIENT_FIELDS
      ];

      allFieldSets.forEach(fieldSet => {
        expect(validateUserFields(fieldSet)).toBe(true);
        expect(fieldSet).not.toContain('password');
        expect(fieldSet).not.toContain('passwordHash');
      });
    });

    it('should never expose sensitive reset tokens', () => {
      const allFieldSets = [
        SAFE_USER_FIELDS,
        USER_PUBLIC_FIELDS,
        DOCTOR_FIELDS,
        PATIENT_FIELDS
      ];

      allFieldSets.forEach(fieldSet => {
        expect(fieldSet).not.toContain('passwordResetToken');
        expect(fieldSet).not.toContain('passwordResetExpires');
      });
    });

    it('should prevent brute force attack metadata exposure', () => {
      const allFieldSets = [
        SAFE_USER_FIELDS,
        USER_PUBLIC_FIELDS,
        DOCTOR_FIELDS,
        PATIENT_FIELDS
      ];

      allFieldSets.forEach(fieldSet => {
        expect(fieldSet).not.toContain('loginAttempts');
        expect(fieldSet).not.toContain('lockoutUntil');
      });
    });
  });

  describe('Mongoose populate() Usage', () => {
    it('should provide fields safe for populate() calls', () => {
      // Simulate Mongoose populate usage
      // .populate('author', DOCTOR_FIELDS)
      // Should never throw or expose sensitive data

      const fieldsForPopulate = DOCTOR_FIELDS;
      expect(() => {
        // Simulate validation
        expect(validateUserFields(fieldsForPopulate)).toBe(true);
      }).not.toThrow();
    });

    it('should allow multiple populate calls with safe fields', () => {
      const populateCalls = [
        DOCTOR_FIELDS,
        USER_PUBLIC_FIELDS,
        PATIENT_FIELDS
      ];

      populateCalls.forEach(fields => {
        expect(validateUserFields(fields)).toBe(true);
      });
    });
  });

  describe('Field Completeness', () => {
    it('should include essential user info fields', () => {
      const fields = SAFE_USER_FIELDS.split(' ');
      expect(fields).toContain('firstName');
      expect(fields).toContain('lastName');
    });

    it('should include user type for authorization decisions', () => {
      const fields = USER_PUBLIC_FIELDS.split(' ');
      expect(fields).toContain('userType');
    });

    it('should include profile picture URL (not internal publicId) (Issue #1052)', () => {
      const fields = USER_PUBLIC_FIELDS.split(' ');
      expect(fields).toContain('profilePicture');
      expect(fields).not.toContain('profilePicturePublicId');
    });

    it('should exclude direct password reference and internal Cloudinary ID', () => {
      const fields = USER_PUBLIC_FIELDS.split(' ');
      expect(fields).not.toContain('password');
      expect(fields).not.toContain('profilePicturePublicId');
    });
  });
});
