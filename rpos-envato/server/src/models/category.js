import statics from '../statics/category'
const mongoose = require('mongoose')
const Schema = mongoose.Schema
const Category = new Schema(
  {
    name: { type: String, default: '' },
    image: { type: String, default: '' },
    count: { type: Number, default: 0 },
    parent: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
    business: { type: mongoose.Schema.Types.ObjectId, ref: 'Business' },
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
Category.statics = statics
module.exports = mongoose.model('Category', Category)
