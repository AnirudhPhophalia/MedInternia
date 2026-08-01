import { Request, Response, NextFunction } from 'express';
import { errorHandler } from '../errorHandler';
import { AppError } from '../../utils/AppError';

/**
 * Tests for Issue #997: Express error handler sanitization
 * Ensures Mongoose ValidationError objects are not exposed in API responses
 */

describe('Error Handler - Mongoose ValidationError Sanitization (Issue #997)', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: jest.Mock;
  let jsonMock: jest.Mock;

  beforeEach(() => {
    mockReq = {};
    jsonMock = jest.fn().mockReturnThis();
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jsonMock,
    };
    mockNext = jest.fn();
    process.env.NODE_ENV = 'production';
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Mongoose ValidationError Handling', () => {
    it('should sanitize Mongoose ValidationError and extract only messages', () => {
      // Simulate Mongoose ValidationError structure
      const mongooseValidationError = {
        name: 'ValidationError',
        message: 'User validation failed',
        errors: {
          firstName: {
            message: 'First name is required',
            kind: 'required',
            path: 'firstName',
            value: null
          },
          email: {
            message: 'Please add a valid email',
            kind: 'regexp',
            path: 'email',
            value: 'invalid-email'
          }
        }
      };

      errorHandler(mongooseValidationError, mockReq as Request, mockRes as Response, mockNext);

      const response = jsonMock.mock.calls[0][0];

      // Should return 400 status
      expect(mockRes.status).toHaveBeenCalledWith(400);

      // Should extract error messages
      expect(response.errors).toBeDefined();
      expect(Array.isArray(response.errors)).toBe(true);
      expect(response.errors.length).toBe(2);
      expect(response.errors).toContain('First name is required');
      expect(response.errors).toContain('Please add a valid email');

      // Should NOT expose raw error objects
      expect(JSON.stringify(response)).not.toContain('kind');
      expect(JSON.stringify(response)).not.toContain('path');
      expect(JSON.stringify(response)).not.toContain('value');
      expect(JSON.stringify(response)).not.toContain('regexp');
    });

    it('should handle ValidationError with no errors object', () => {
      const invalidError = {
        name: 'ValidationError',
        message: 'Validation failed',
        errors: null
      };

      errorHandler(invalidError, mockReq as Request, mockRes as Response, mockNext);

      const response = jsonMock.mock.calls[0][0];

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(response.message).toBe('Validation error');
      // errors should be null if nothing can be extracted
      expect(response.errors).toBeNull();
    });

    it('should handle ValidationError with non-string error messages', () => {
      const mongooseValidationError = {
        name: 'ValidationError',
        message: 'Validation failed',
        errors: {
          age: {
            message: 'Age must be a number',
            // Some fields might not have standard structure
            value: { complex: 'object' }
          },
          status: 'error' // Malformed error entry
        }
      };

      errorHandler(mongooseValidationError, mockReq as Request, mockRes as Response, mockNext);

      const response = jsonMock.mock.calls[0][0];

      expect(mockRes.status).toHaveBeenCalledWith(400);
      // Should only extract valid message strings
      expect(response.errors).toBeDefined();
      expect(response.errors.length).toBe(1);
      expect(response.errors).toContain('Age must be a number');
    });

    it('should not expose Mongoose error metadata in production', () => {
      const mongooseValidationError = {
        name: 'ValidationError',
        message: 'Validation failed',
        errors: {
          field1: {
            message: 'Error message',
            kind: 'required',
            path: 'field1',
            schema: { /* schema object */ },
            constructor: { name: 'ValidatorError' }
          }
        }
      };

      errorHandler(mongooseValidationError, mockReq as Request, mockRes as Response, mockNext);

      const response = jsonMock.mock.calls[0][0];
      const responseJson = JSON.stringify(response);

      // Production should not expose stack trace
      expect(response.stack).toBeUndefined();

      // Should not expose Mongoose internals
      expect(responseJson).not.toContain('kind');
      expect(responseJson).not.toContain('constructor');
      expect(responseJson).not.toContain('schema');
    });

    it('should expose full error details in development mode', () => {
      process.env.NODE_ENV = 'development';

      const mongooseValidationError = {
        name: 'ValidationError',
        message: 'Validation failed',
        errors: {
          field: { message: 'Error' }
        },
        stack: 'Error: Validation failed\n  at ...'
      };

      errorHandler(mongooseValidationError, mockReq as Request, mockRes as Response, mockNext);

      const response = jsonMock.mock.calls[0][0];

      // In development, should include stack trace for debugging
      expect(response.stack).toBeDefined();
    });
  });

  describe('Other Error Types', () => {
    it('should handle CastError without exposing raw object', () => {
      const castError = {
        name: 'CastError',
        path: 'userId',
        value: 'invalid-id',
        message: 'Cast to ObjectId failed'
      };

      errorHandler(castError, mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      const response = jsonMock.mock.calls[0][0];
      expect(response.message).toContain('Invalid format for field');
      // Should not expose raw error object
      expect(response).not.toHaveProperty('errors');
    });

    it('should handle duplicate key error', () => {
      const duplicateError = {
        code: 11000,
        message: 'duplicate key',
        keyPattern: { email: 1 }
      };

      errorHandler(duplicateError, mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(409);
      const response = jsonMock.mock.calls[0][0];
      expect(response.message).toContain('already exists');
    });

    it('should handle AppError', () => {
      const appError = new AppError('User not found', 404);

      errorHandler(appError, mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      const response = jsonMock.mock.calls[0][0];
      expect(response.message).toBe('User not found');
    });

    it('should handle unknown errors with default status', () => {
      const unknownError = new Error('Something went wrong');

      errorHandler(unknownError, mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      const response = jsonMock.mock.calls[0][0];
      expect(response.message).toBe('Something went wrong');
    });
  });

  describe('Response Format Security', () => {
    it('should never include raw error constructor in response', () => {
      const errorWithConstructor = {
        name: 'ValidationError',
        message: 'Validation failed',
        errors: {
          field: {
            message: 'Error message',
            constructor: function() {} // Should never be exposed
          }
        }
      };

      errorHandler(errorWithConstructor, mockReq as Request, mockRes as Response, mockNext);

      const response = jsonMock.mock.calls[0][0];
      const responseJson = JSON.stringify(response);

      expect(responseJson).not.toContain('constructor');
      expect(responseJson).not.toContain('function');
    });

    it('should provide user-friendly error messages', () => {
      const mongooseValidationError = {
        name: 'ValidationError',
        message: 'Validation failed',
        errors: {
          password: {
            message: 'Password must be at least 8 characters and contain uppercase, lowercase, digit, and special character',
            kind: 'user defined',
            path: 'password'
          }
        }
      };

      errorHandler(mongooseValidationError, mockReq as Request, mockRes as Response, mockNext);

      const response = jsonMock.mock.calls[0][0];

      // Error message should be clear to end users
      expect(response.errors[0]).toContain('Password must be at least 8 characters');
      expect(response.message).toBe('Validation error');
      expect(response.success).toBe(false);
    });
  });
});
