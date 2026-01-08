/* eslint-disable prefer-promise-reject-errors */
import Product from '../models/product'
import Category from '../models/category'
import Services from '../services/index'
const { body, param, query } = require('express-validator')

export default {
  validateAdd: [
    body('sku')
      .exists()
      .withMessage('sku is required')
      .custom((value, { req }) => {
        return Product.findOne({ sku: value, business: req.business }).then((item) => {
          if (item) {
            return Promise.reject('sku is existed')
          }
        })
      }),
    body('name').exists().withMessage('name is required'),
    body('category')
      .optional()
      .custom((value) => {
        return Category.findById(value).then((item) => {
          if (!item) {
            return Promise.reject('category not found')
          }
        })
      }),
    body('quantity').optional().isInt().withMessage('quantity must be int'),
    body('sellingPrice').optional().isNumeric().withMessage('sellingPrice must be number'),
    body('purchasePrice').optional().isNumeric().withMessage('purchasePrice must be number'),
    body('images')
      .optional()
      .custom((value) => {
        return Promise.all([
          ...value.map(async (image) => {
            return Services.file.checkFileFromClient(image)
          })
        ])
      })
  ],
  validateEdit: [
    param('id')
      .exists()
      .withMessage('id not found')
      .custom((value) => {
        return Product.findOne({ _id: value }).then((item) => {
          if (!item) {
            return Promise.reject(value + ' not found')
          }
        })
      }),
    body('sku')
      .optional()
      .custom((value, { req }) => {
        return Product.findOne({ sku: value, _id: { $ne: req.params.id } }).then((item) => {
          if (item) {
            return Promise.reject('sku is exist')
          }
        })
      }),
    body('category')
      .optional()
      .custom((value) => {
        return Category.findById(value).then((item) => {
          if (!item) {
            return Promise.reject('category not found')
          }
        })
      }),
    body('quantity').optional().isInt().withMessage('quantity must be int'),
    body('sellingPrice').optional().isNumeric().withMessage('sellingPrice must be number'),
    body('purchasePrice').optional().isNumeric().withMessage('purchasePrice must be number'),
    body('images')
      .optional()
      .custom((value) => {
        return Promise.all([
          ...value.map(async (image) => {
            return Services.file.checkFileFromClient(image)
          })
        ])
      })
  ],
  validateDelete: [
    param('id')
      .exists()
      .withMessage('id not found')
      .custom((value) => {
        return Product.findOne({ _id: value }).then((item) => {
          if (!item) {
            return Promise.reject(value + ' not found')
          }
        })
      })
  ],
  validateGet: [
    query('page')
      .optional()
      .isInt([{ min: 1 }])
      .withMessage('Invalid page'),
    query('limit')
      .optional()
      .isInt([{ min: 1 }])
      .withMessage('Invalid limit'),
    query('category')
      .optional()
      .custom((value) => {
        return Category.findById(value).then((item) => {
          if (!item) {
            return Promise.reject('category not found')
          }
        })
      })
  ]
}
