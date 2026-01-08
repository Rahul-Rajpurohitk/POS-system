/* eslint-disable prefer-promise-reject-errors */
import Constants from '../common/constants'
import File from '../models/file'
import User from '../models/user'
const { check, param } = require('express-validator')

export default {
  validateRegister: [
    check('businessName').exists().withMessage('businessName is required'),
    check('firstName').exists().withMessage('firstName is required'),
    check('lastName').exists().withMessage('lastName is required'),
    check('email')
      .exists()
      .withMessage('email is required')
      .isEmail()
      .withMessage('The Email Address is in an invalid format.')
      .custom((value) => {
        return User.findOne({ email: value }).then((item) => {
          if (item) {
            return Promise.reject(value + ' is existed')
          }
        })
      }),
    check('password').exists().withMessage('password is required'),
    check('role')
      .optional()
      .custom((value) => Object.values(Constants.Role).indexOf(value) > -1)
      .withMessage('Invalid role')
  ],
  validateLogin: [
    check('email')
      .exists()
      .withMessage('email is required')
      .isEmail()
      .withMessage('The Email Address is in an invalid format.'),
    check('password').exists().withMessage('password is required')
  ],
  validateForgotPassword: [
    check('email')
      .exists()
      .withMessage('email is required')
      .isEmail()
      .withMessage('The Email Address is in an invalid format.')
      .custom((value) => {
        return User.findOne({ email: value }).then((item) => {
          if (!item) {
            return Promise.reject(value + ' is not existed')
          }
        })
      })
  ],
  validateResetPassword: [
    check('token')
      .exists()
      .withMessage('token is required')
      .custom((value) => {
        return User.findOne({ _id: value }).then((item) => {
          if (!item) {
            return Promise.reject(value + ' is not existed')
          }
        })
      }),
    check('code')
      .exists()
      .withMessage('code is required')
      .custom((value, { req }) => {
        return User.findOne({ _id: req.body.token, resetCode: value }).then((item) => {
          if (!item) {
            return Promise.reject('The code is incorrect.')
          }
        })
      }),
    check('password').exists().withMessage('password is required')
  ]
}
