// src/middleware/validate.js
const { body, param, query, validationResult } = require('express-validator');

const validationHandler = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });
  next();
};

module.exports = { body, param, query, validationHandler };
