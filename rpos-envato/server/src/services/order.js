/* eslint-disable node/handle-callback-err */
import _ from 'lodash'
const Product = require('../models/product')
const Coupon = require('../models/coupon')
const Order = require('../models/order')

const Constants = require('../common/constants')

const getOrderProducts = (items) => {
  return new Promise((resolve, reject) => {
    const carts = []
    items.forEach((item) => {
      Product.findById(item.product, (err, product) => {
        if (err) return reject(err)
        if (product.quantity >= item.quantity) {
          carts.push({ product, quantity: item.quantity })
          if (carts.length === items.length) {
            resolve(carts)
          }
        } else {
          reject(new Error(__(product.name + ' is current out of stock')))
        }
      })
    })
  })
}

const getOrderCoupon = (coupon) => {
  return new Promise((resolve, reject) => {
    Coupon.findById(coupon, (err, item) => {
      if (err) return reject(err)
      resolve(item)
    })
  })
}

const updateOrderProducts = (items) => {
  return new Promise((resolve, reject) => {
    let count = 0
    items.forEach((item) => {
      // eslint-disable-next-line node/handle-callback-err
      Product.findById(item.product, (err, product) => {
        if (product) {
          Product.findByIdAndUpdate(
            item.product,
            {
              $inc: {
                quantity: item.quantity * -1,
                'sellingInfo.quantity': item.quantity,
                'sellingInfo.amount': item.quantity * product.sellingPrice,
                'sellingInfo.profit': item.quantity * (product.sellingPrice - product.purchasePrice)
              }
            },
            (err, product) => {
              if (err) return reject(err)
              count++
              if (count == items.length) {
                resolve()
              }
            }
          )
        }
      })
    })
  })
}

const returnOrderProducts = (items) => {
  return new Promise((resolve, reject) => {
    let count = 0
    items.forEach((item) => {
      Product.findByIdAndUpdate(
        item.product,
        { $inc: { quantity: item.quantity } },
        (err, product) => {
          if (err) return reject(err)
          count++
          if (count === items.length) {
            resolve()
          }
        }
      )
    })
  })
}

const createOrder = async (params, cb) => {
  try {
    const carts = await getOrderProducts(params.items)
    const subTotal = _.sumBy(carts, (item) => {
      return item.product.sellingPrice * item.quantity
    })
    let discount = 0
    if (params.coupon) {
      const coupon = await getOrderCoupon(params.coupon)
      discount =
        coupon.type === Constants.CouponType.Fixed ? coupon.amount : subTotal * coupon.amount * 0.01
    }
    const total = subTotal - discount

    Order.findOne()
      .sort({ createdAt: -1 })
      .exec(function (err, lastOrder) {
        let order = { ...params, payment: { subTotal, discount, total } }
        if (lastOrder) {
          order.number = lastOrder.number + 1
        } else {
          order.number = 0
        }
        order = new Order(order)
        order.save(async (err, item) => {
          if (!err && item) {
            await updateOrderProducts(params.items)
          }
          cb(err, item)
        })
      })
  } catch (error) {
    cb(error, null)
  }
}

const updateOrder = async (id, params, cb) => {
  try {
    Order.findById(id, async (err, order) => {
      if (!err && order) {
        await returnOrderProducts(params.items ? params.items : order.items)
        const carts = await getOrderProducts(params.items ? params.items : order.items)
        const subTotal = _.sumBy(carts, (item) => {
          return item.product.sellingPrice * item.quantity
        })
        let discount = 0
        if (params.coupon || order.coupon) {
          const coupon = await getOrderCoupon(params.coupon ? params.coupon : order.coupon)
          discount =
            coupon.type === Constants.CouponType.Fixed
              ? coupon.amount
              : subTotal * coupon.amount * 0.01
        }
        const total = subTotal - discount

        Order.findByIdAndUpdate(
          id,
          { $set: { ...params, payment: { subTotal, discount, total } } },
          async (err, item) => {
            if (!err && item) {
              await updateOrderProducts(params.items ? params.items : order.items)
            }
            Order.findById(id, cb)
          }
        )
      } else {
        cb(err, null)
      }
    })
  } catch (error) {
    cb(error, null)
  }
}

const deleteOrder = async (id, cb) => {
  try {
    Order.findById(id, (err, order) => {
      if (!err && order) {
        const items = order.items
        Order.findByIdAndRemove(id, (err, item) => {
          if (!err) {
            let count = 0
            items.forEach((item) => {
              Product.findOneAndUpdate(
                { _id: item.product },
                { $inc: { quantity: item.quantity } },
                (err, item) => {
                  count++
                  if (count == items.length) {
                    cb(null, null)
                  }
                }
              )
            })
          } else {
            cb(err, null)
          }
        })
      } else {
        cb(err, null)
      }
    })
  } catch (error) {
    cb(error, null)
  }
}

export default {
  createOrder,
  updateOrder,
  deleteOrder
}
