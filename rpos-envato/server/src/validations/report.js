import { isDate } from '../common/utils'
const { query } = require('express-validator')

export default {
  validateDaily: [
    query('date').optional().custom(value => isDate(value)).withMessage('Invalid date')
  ],
  validateProduct: [
    query('limit').optional().isInt([{ min: 1 }]).withMessage('Invalid limit')
  ]
}
