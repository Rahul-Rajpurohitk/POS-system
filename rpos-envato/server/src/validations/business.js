const { check } = require('express-validator')

export default {
  validateUpdateBusinesses: [
    check('tax')
      .optional()
      .isNumeric([{ min: 0, max: 100 }])
      .withMessage('Invalid tax')
  ]
}
