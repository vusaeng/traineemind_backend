// middleware/validate.js
import { body, param, validationResult } from 'express-validator';

// Re-export the validators
export { body, param };

// Validation handler
export const validationHandler = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};