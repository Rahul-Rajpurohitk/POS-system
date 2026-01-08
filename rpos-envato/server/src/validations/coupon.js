/* eslint-disable prefer-promise-reject-errors */
import Constants from '../common/constants'
import Coupon from '../models/coupon'
import { isUtcFormat } from '../common/utils'
const { body, check, param } = require('express-validator')

export default {
  validateAdd: [
    body('code')
      .exists()
      .withMessage('code is required')
      .custom((value) => {
        return Coupon.findOne({ code: value, enable: true }).then((item) => {
          if (item) {
            return Promise.reject(value + ' is existed')
          }
        })
      }),
    body('name').exists().withMessage('name is required'),
    check('type')
      .exists()
      .withMessage('type is required')
      .custom((value) => Object.values(Constants.CouponType).indexOf(value) > -1)
      .withMessage('Invalid type'),
    body('amount')
      .exists()
      .withMessage('amount is required')
      .isNumeric([{ min: 0 }])
      .withMessage('Invalid amount'),
    body('expiredAt')
      .optional()
      .custom((value) => {
        if (!isUtcFormat(value)) {
          return Promise.reject('expiredAt must be utc time')
        }
        return Promise.resolve()
      })
  ],
  validateEdit: [
    param('id')
      .exists()
      .withMessage('id not found')
      .custom((value) => {
        return Coupon.findOne({ _id: value }).then((item) => {
          if (!item) {
            return Promise.reject(value + ' not found')
          }
        })
      }),
    check('type')
      .optional()
      .custom((value) => Object.values(Constants.CouponType).indexOf(value) > -1)
      .withMessage('Invalid type'),
    body('amount')
      .optional()
      .isNumeric([{ min: 0 }])
      .withMessage('Invalid amount'),
    body('code')
      .optional()
      .custom((value, { req }) => {
        return Coupon.findOne({ code: value, enable: true, _id: { $ne: req.params.id } }).then(
          (item) => {
            if (item) {
              return Promise.reject(value + ' is existed')
            }
          }
        )
      }),
    body('expiredAt')
      .optional()
      .custom((value) => {
        if (!isUtcFormat(value)) {
          return Promise.reject('expiredAt must be utc time')
        }
        return Promise.resolve()
      })
  ],
  validateDelete: [
    param('id')
      .exists()
      .withMessage('id not found')
      .custom((value) => {
        return Coupon.findOne({ _id: value }).then((item) => {
          if (!item) {
            return Promise.reject(value + ' not found')
          }
        })
      })
  ]
}
