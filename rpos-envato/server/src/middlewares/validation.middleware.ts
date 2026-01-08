import { Request, Response, NextFunction } from 'express';
import { validationResult, ValidationChain } from 'express-validator';
import logger from '../config/logger';

/**
 * Middleware to handle validation errors from express-validator
 */
export const validate = (validations: ValidationChain[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Execute all validations
    await Promise.all(validations.map((validation) => validation.run(req)));

    // Check for validation errors
    const errors = validationResult(req);

    if (errors.isEmpty()) {
      return next();
    }

    // Log validation errors
    logger.warn('Validation failed', {
      path: req.path,
      method: req.method,
      errors: errors.array(),
      ip: req.ip,
    });

    // Return validation errors to client
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map((error) => ({
        field: error.type === 'field' ? error.path : undefined,
        message: error.msg,
      })),
    });
  };
};

/**
 * Common validation chains for reuse
 */
export const commonValidations = {
  /**
   * Validate pagination parameters
   */
  pagination: () => {
    const { query } = require('express-validator');

    return [
      query('page')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Page must be a positive integer')
        .toInt(),
      query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limit must be between 1 and 100')
        .toInt(),
    ];
  },

  /**
   * Validate date range parameters
   */
  dateRange: () => {
    const { query } = require('express-validator');

    return [
      query('startDate')
        .optional()
        .isISO8601()
        .withMessage('Start date must be a valid ISO 8601 date')
        .toDate(),
      query('endDate')
        .optional()
        .isISO8601()
        .withMessage('End date must be a valid ISO 8601 date')
        .toDate()
        .custom((endDate, { req }) => {
          if (req.query.startDate && new Date(endDate) < new Date(req.query.startDate)) {
            throw new Error('End date must be after start date');
          }
          return true;
        }),
    ];
  },

  /**
   * Validate MongoDB ObjectId
   */
  objectId: (field: string = 'id') => {
    const { param } = require('express-validator');

    return [
      param(field)
        .matches(/^[0-9a-fA-F]{24}$/)
        .withMessage(`${field} must be a valid MongoDB ObjectId`),
    ];
  },

  /**
   * Validate UUID
   */
  uuid: (field: string = 'id') => {
    const { param } = require('express-validator');

    return [
      param(field)
        .isUUID()
        .withMessage(`${field} must be a valid UUID`),
    ];
  },

  /**
   * Validate email
   */
  email: (field: string = 'email') => {
    const { body } = require('express-validator');

    return [
      body(field)
        .isEmail()
        .normalizeEmail()
        .withMessage('Must be a valid email address'),
    ];
  },

  /**
   * Validate password strength
   */
  password: (field: string = 'password') => {
    const { body } = require('express-validator');

    return [
      body(field)
        .isLength({ min: 8 })
        .withMessage('Password must be at least 8 characters long')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
    ];
  },

  /**
   * Validate phone number
   */
  phone: (field: string = 'phone') => {
    const { body } = require('express-validator');

    return [
      body(field)
        .optional()
        .matches(/^[\d\s\-\+\(\)]+$/)
        .withMessage('Phone number must be valid')
        .isLength({ min: 10, max: 20 })
        .withMessage('Phone number must be between 10 and 20 characters'),
    ];
  },

  /**
   * Sanitize and validate string input
   */
  string: (field: string, options: { min?: number; max?: number; required?: boolean } = {}) => {
    const { body } = require('express-validator');
    const { min = 1, max = 500, required = true } = options;

    const validation = body(field).trim();

    if (required) {
      validation.notEmpty().withMessage(`${field} is required`);
    } else {
      validation.optional();
    }

    return [
      validation
        .isLength({ min, max })
        .withMessage(`${field} must be between ${min} and ${max} characters`)
        .escape(), // Prevent XSS
    ];
  },

  /**
   * Validate numeric input
   */
  number: (field: string, options: { min?: number; max?: number; required?: boolean } = {}) => {
    const { body } = require('express-validator');
    const { min, max, required = true } = options;

    const validation = body(field);

    if (required) {
      validation.notEmpty().withMessage(`${field} is required`);
    } else {
      validation.optional();
    }

    validation.isNumeric().withMessage(`${field} must be a number`);

    if (min !== undefined) {
      validation.custom((value: number) => value >= min)
        .withMessage(`${field} must be at least ${min}`);
    }

    if (max !== undefined) {
      validation.custom((value: number) => value <= max)
        .withMessage(`${field} must be at most ${max}`);
    }

    return [validation.toFloat()];
  },
};
