import statics from '../statics/order'
const mongoose = require('mongoose')
const deepPopulate = require('mongoose-deep-populate')(mongoose)
const Schema = mongoose.Schema

const Order = new Schema(
  {
    number: { type: Number, default: 0 },
    items: [
      {
        product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
        quantity: { type: mongoose.Schema.Types.Number }
      }
    ],
    coupon: { type: mongoose.Schema.Types.ObjectId, ref: 'Coupon' },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
    guest: {
      name: { type: mongoose.Schema.Types.String },
      email: { type: mongoose.Schema.Types.String },
      phone: { type: mongoose.Schema.Types.String },
      address: { type: mongoose.Schema.Types.String }
    },
    business: { type: mongoose.Schema.Types.ObjectId, ref: 'Business' },
    payment: {
      subTotal: { type: mongoose.Schema.Types.Number },
      discount: { type: mongoose.Schema.Types.Number },
      total: { type: mongoose.Schema.Types.Number }
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now }
  },
  {
    toObject: {
      transform: function (doc, ret, options) {
        delete ret.__v
        return ret
      }
    },
    toJSON: {
      transform: function (doc, ret, options) {
        delete ret.__v
        return ret
      }
    }
  }
)
Order.plugin(deepPopulate)
Order.statics = statics
module.exports = mongoose.model('Order', Order)
