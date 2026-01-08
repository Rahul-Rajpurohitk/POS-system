/* eslint-disable prefer-promise-reject-errors */
import Constants from '../common/constants'
import File from '../models/file'
import User from '../models/user'
const { check, param } = require('express-validator')

export default {
  validateChangePass: [
    check('oldPass').exists().withMessage('oldPass is required'),
    check('newPass').exists().withMessage('newPass is required'),
    check('confirmPass')
      .exists()
      .withMessage('confirmPass is required')
      .custom((value, { req }) => value == req.body.newPass)
      .withMessage('The password is not match.')
  ],
  validateUpdateUser: [
    check('email')
      .optional()
      .isEmail()
      .withMessage('The Email Address is in an invalid format.')
      .custom((value, { req }) => {
        return User.findOne({ email: value, _id: { $ne: req.userId } }).then((item) => {
          if (item) {
            return Promise.reject(value + ' is existed')
          }
        })
      }),
    check('role')
      .optional()
      .custom((value) => Object.values(Constants.Role).indexOf(value) > -1)
      .withMessage('Invalid role'),
    check('avatar')
      .optional()
      .custom((value) => {
        return File.findOne({ file: value }).then((file) => {
          if (!file) {
            return Promise.reject('File not found')
          }
        })
      })
  ],
  validateUpdateStaff: [
    check('email')
      .optional()
      .isEmail()
      .withMessage('The Email Address is in an invalid format.')
      .custom((value, { req }) => {
        return User.findOne({ email: value, _id: { $ne: req.params.id } }).then((item) => {
          if (item) {
            return Promise.reject(value + ' is existed')
          }
        })
      }),
    check('role')
      .optional()
      .custom((value) => Object.values(Constants.Role).indexOf(value) > -1)
      .withMessage('Invalid role'),
    check('avatar')
      .optional()
      .custom((value) => {
        return File.findOne({ file: value }).then((file) => {
          if (!file) {
            return Promise.reject('File not found')
          }
        })
      })
  ],
  validateDeleteStaff: [
    param('id')
      .exists()
      .withMessage('id not found')
      .custom((value) => {
        return User.findOne({ _id: value, role: Constants.Role.Staff }).then((item) => {
          if (!item) {
            return Promise.reject(value + ' not found')
          }
        })
      })
  ]
}
