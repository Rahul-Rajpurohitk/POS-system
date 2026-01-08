import _ from 'lodash'
import moment from 'moment'
const Order = require('../models/order')
const Product = require('../models/product')
require('mongoose-pagination')

async function reportDaily(req, res, next) {
  const query = { business: req.business }
  let start = moment().startOf('day')
  let end = moment().endOf('day')
  if (req.query.date != undefined && req.query.date.length > 0) {
    start = moment(req.query.date).startOf('day')
    end = moment(req.query.date).endOf('day')
  }
  query.createdAt = { $gte: start, $lt: end }
  Order.find(query).deepPopulate('items.product').populate('customer').populate('coupon').exec((err, items) => {
    if (err) return next(err)
    res.json(items)
  })
}

async function reportWeekly(req, res, next) {
  const query = { business: req.business }
  const start = moment().startOf('week')
  const end = moment().endOf('week')
  query.createdAt = { $gte: start, $lt: end }
  Order.find(query).exec((err, items) => {
    if (err) return next(err)
    const results = {
      mon: 0,
      tue: 0,
      wed: 0,
      thu: 0,
      fri: 0,
      sat: 0,
      sun: 0
    }
    items.forEach((item) => {
      const order = item.toObject()
      const index = moment(order.createdAt).isoWeekday()
      const key = Object.keys(results)[index - 1]
      results[key] += order.payment.total
    })
    res.json(results)
  })
}

async function reportMonthly(req, res, next) {
  const query = { business: req.business }
  const start = moment().startOf('week')
  const end = moment().endOf('week')
  query.createdAt = { $gte: start, $lt: end }
  Order.find(query).exec((err, items) => {
    if (err) return next(err)
    const results = {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
      6: 0,
      7: 0,
      8: 0,
      9: 0,
      10: 0,
      11: 0,
      12: 0
    }
    items.forEach((item) => {
      const order = item.toObject()
      const index = moment(order.createdAt).month()
      const key = Object.keys(results)[index]
      results[key] += order.payment.total
    })
    res.json(results)
  })
}

async function topProducts(req, res, next) {
  const query = { business: req.business }
  const limit = req.query.limit ? parseInt(req.query.limit) : 20
  Product.find(query).sort({ 'sellingInfo.quantity': -1 }).limit(limit).exec((err, items) => {
    if (err) return next(err)
    const products = []
    items.forEach((item) => {
      const product = item.toObject()
      products.push({
        _id: product._id,
        name: product.name,
        ...product.sellingInfo
      })
    })
    res.json(products)
  })
}

export default {
  reportDaily,
  reportMonthly,
  reportWeekly,
  topProducts
}