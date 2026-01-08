import statics from '../statics/product'
const mongoose = require('mongoose')
const Schema = mongoose.Schema

const Product = new Schema(
  {
    name: { type: String, default: '' },
    sku: { type: String, default: '' },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
    desc: { type: String, default: '' },
    quantity: { type: Number, default: 0 },
    sellingPrice: { type: Number, default: 0 },
    purchasePrice: { type: Number, default: 0 },
    images: [{ type: String }],
    business: { type: mongoose.Schema.Types.ObjectId, ref: 'Business' },
    sellingInfo: {
      quantity: { type: Number, default: 0 },
      amount: { type: Number, default: 0 },
      profit: { type: Number, default: 0 }
    },
    enable: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now }
  },
  {
    toObject: {
      transform: function (doc, ret, options) {
        delete ret.__v
      }
    },
    toJSON: {
      transform: function (doc, ret, options) {
        delete ret.__v
      }
    }
  }
)
Product.statics = statics
module.exports = mongoose.model('Product', Product)
