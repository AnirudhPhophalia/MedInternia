/**
 * Utility functions for secure MongoDB search operations.
 * Prevents ReDoS (Regular Expression Denial of Service) attacks.
 */

/**
 * Escapes special regex characters in user input to prevent regex-based DoS
 * @param str - Raw user input string
 * @returns Escaped string safe for regex
 */
export const escapeRegexSpecialChars = (str: string): string => {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

/**
 * Validates and sanitizes search input
 * @param input - Raw user input
 * @param maxLength - Maximum allowed length (default: 100)
 * @returns Sanitized input or null if invalid
 */
export const validateSearchInput = (
  input: unknown,
  maxLength: number = 100
): string | null => {
  if (typeof input !== 'string') {
    return null;
  }

  const trimmed = input.trim();

  // Empty or too long
  if (trimmed.length === 0 || trimmed.length > maxLength) {
    return null;
  }

  return trimmed;
};

/**
 * Creates a safe regex filter for MongoDB queries
 * @param input - User search input
 * @param maxLength - Maximum allowed length
 * @returns Object with $regex and $options for MongoDB or null if invalid
 */
export const createSafeRegexFilter = (
  input: unknown,
  maxLength: number = 100
): { $regex: string; $options: string } | null => {
  const validated = validateSearchInput(input, maxLength);
  if (!validated) {
    return null;
  }

  return {
    $regex: escapeRegexSpecialChars(validated),
    $options: 'i' // Case-insensitive
  };
};

/**
 * Creates a MongoDB text search filter for better performance than $regex
 * Note: Requires text indexes to be defined on the collection
 * @param input - User search input
 * @param maxLength - Maximum allowed length
 * @returns Object with $text search or null if invalid
 */
export const createTextSearchFilter = (
  input: unknown,
  maxLength: number = 100
): { $text: { $search: string } } | null => {
  const validated = validateSearchInput(input, maxLength);
  if (!validated) {
    return null;
  }

  // Escape quotes for text search
  const escaped = validated.replace(/"/g, '\\"');

  return {
    $text: {
      $search: escaped
    }
  };
};

/**
 * Escapes regex special characters for use in RegExp constructor
 * Used when constructing RegExp objects for array matching
 * @param str - Raw user input string
 * @returns Escaped string safe for RegExp constructor
 */
export const escapeRegexForArray = (str: string): string => {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};
