import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/AppError";

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  let statusCode = err.statusCode || 500;
  let message = err.message || "Internal server error";
  let errors: string[] | null = null;

  // Log error in development
  if (process.env.NODE_ENV === "development") {
    console.error(err);
  }

  // Handle Mongoose CastError
  if (err.name === "CastError") {
    statusCode = 400;
    message = `Invalid format for field ${err.path || ""}: ${err.value}`;
  }
  // Handle Mongoose duplicate key error (code 11000)
  else if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyPattern || {})[0] || "Field";
    message = `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`;
  }
  // Handle Mongoose ValidationError (Issue #997)
  // Never expose raw Mongoose ValidationError objects - sanitize and extract messages only
  else if (err.name === "ValidationError") {
    statusCode = 400;
    message = "Validation error";
    // Safely extract error messages without exposing Mongoose error objects
    errors = [];
    if (err.errors && typeof err.errors === 'object') {
      for (const field in err.errors) {
        const fieldError = err.errors[field];
        // Only extract the message string, never the error object itself
        if (fieldError && typeof fieldError.message === 'string') {
          errors.push(fieldError.message);
        }
      }
    }
    // If no errors were extracted, use generic message
    if (errors.length === 0) {
      errors = null;
    }
  }
  // Handle AppError
  else if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
  }

  res.status(statusCode).json({
    success: false,
    message,
    errors,
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
};
