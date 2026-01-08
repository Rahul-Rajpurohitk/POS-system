/* eslint-disable prefer-promise-reject-errors */
import Customer from '../models/customer'
const { check, param, query } = require('express-validator')

export default {
  validateAdd: [
    check('name').exists().withMessage('name is required'),
    check('email').exists().withMessage('email is required').isEmail().withMessage('The Email Address is in an invalid format.').custom(value => {
      return Customer.findOne({ email: value }).then(item => {
        if (item) {
          return Promise.reject(value + ' is existed')
        }
      })
    })
  ],
  validateEdit: [
    param('id').exists().withMessage('id not found').custom(value => {
      return Customer.findOne({ _id: value }).then(item => {
        if (!item) {
          return Promise.reject(value + ' not found')
        }
      })
    }),
    check('email').optional().isEmail().withMessage('The Email Address is in an invalid format.')
  ],
  validateDelete: [
    param('id').exists().withMessage('id not found').custom(value => {
      return Customer.findOne({ _id: value }).then(item => {
        if (!item) {
          return Promise.reject(value + ' not found')
        }
      })
    })
  ],
  validateGet: [
    query('page').optional().isInt([{ min: 1 }]).withMessage('Invalid page'),
    query('limit').optional().isInt([{ min: 1 }]).withMessage('Invalid limit')
  ]
}
