import { Request, Response, NextFunction } from 'express';
import { validationResult, ValidationChain } from 'express-validator';

/**
 * Validation middleware - Checks express-validator results
 */
export const validate = (validations: ValidationChain[]) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Run all validations
    await Promise.all(validations.map((validation) => validation.run(req)));

    // Check for errors
    const errors = validationResult(req);

    if (errors.isEmpty()) {
      return next();
    }

    // Return first error
    const firstError = errors.array()[0];
    res.status(400).json({
      message: firstError.msg,
      errors: errors.array(),
    });
  };
};

/**
 * Simple validation result check middleware
 */
export const checkValidation = (req: Request, res: Response, next: NextFunction): void => {
  const errors = validationResult(req);

  if (errors.isEmpty()) {
    return next();
  }

  const firstError = errors.array()[0];
  res.status(400).json({
    message: firstError.msg,
    errors: errors.array(),
  });
};

export default { validate, checkValidation };
