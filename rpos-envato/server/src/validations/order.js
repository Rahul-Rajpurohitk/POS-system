/* eslint-disable prefer-promise-reject-errors */
import Order from '../models/order'
import Product from '../models/product'
import Coupon from '../models/coupon'
import Customer from '../models/customer'
const { body, param, query } = require('express-validator')

export default {
  validateAdd: [
    body('items').exists().withMessage('items is required').custom(value => {
      return Promise.all([
        value.forEach((item) => {
          return Product.findById(item.product).then(item => {
            if (!item) {
              return Promise.reject(item.product + ' not found')
            }
          })
        })
      ])
    }),
    body('coupon').optional().custom(value => {
      return Coupon.findOne({ _id: value }).then(item => {
        if (!item) {
          return Promise.reject(value + ' not found')
        }
      })
    }),
    body('customer').optional().custom(value => {
      return Customer.findOne({ _id: value }).then(item => {
        if (!item) {
          return Promise.reject(value + ' not found')
        }
      })
    })
  ],
  validateEdit: [
    param('id').exists().withMessage('id not found').custom(value => {
      return Order.findOne({ _id: value }).then(item => {
        if (!item) {
          return Promise.reject(value + ' not found')
        }
      })
    }),
    body('items').optional().custom(value => {
      return Promise.all([
        value.forEach((item) => {
          return Product.findById(item.product).then(item => {
            if (!item) {
              return Promise.reject(item.product + ' not found')
            }
          })
        })
      ])
    }),
    body('coupon').optional().custom(value => {
      return Coupon.findOne({ _id: value }).then(item => {
        if (!item) {
          return Promise.reject(value + ' not found')
        }
      })
    }),
    body('customer').optional().custom(value => {
      return Customer.findOne({ _id: value }).then(item => {
        if (!item) {
          return Promise.reject(value + ' not found')
        }
      })
    })
  ],
  validateDelete: [
    param('id').exists().withMessage('id not found').custom(value => {
      return Order.findOne({ _id: value }).then(item => {
        if (!item) {
          return Promise.reject(value + ' not found')
        }
      })
    })
  ],
  validateGet: [
    query('page').optional().isInt([{ min: 1 }]).withMessage('Invalid page'),
    query('limit').optional().isInt([{ min: 1 }]).withMessage('Invalid limit'),
    query('customer').optional().custom(value => {
      return Customer.findOne({ _id: value }).then(item => {
        if (!item) {
          return Promise.reject(value + ' not found')
        }
      })
    })
  ]
}
