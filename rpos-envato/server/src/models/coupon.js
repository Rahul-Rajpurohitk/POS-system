const mongoose = require('mongoose')
const Schema = mongoose.Schema
const Constants = require('../common/constants')

const Coupon = new Schema(
  {
    code: { type: String, default: '' },
    name: { type: String, default: '' },
    type: { type: String, default: Constants.CouponType.Fixed },
    amount: { type: Number, default: 0 },
    business: { type: mongoose.Schema.Types.ObjectId, ref: 'Business' },
    expiredAt: { type: Date },
    enable: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now }
  },
  {
    toObject: {
      transform: function (doc, ret, options) {
        delete ret.__v
        delete ret.enable
        delete ret.createdAt
        delete ret.business
        return ret
      }
    },
    toJSON: {
      transform: function (doc, ret, options) {
        delete ret.__v
        delete ret.enable
        delete ret.createdAt
        delete ret.business
        return ret
      }
    }
  }
)

module.exports = mongoose.model('Coupon', Coupon)
