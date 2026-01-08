import statics from '../statics/log'
import Constants from '../common/constants'
const mongoose = require('mongoose')
const Schema = mongoose.Schema
const deepPopulate = require('mongoose-deep-populate')(mongoose)

const Log = new Schema(
  {
    type: { type: String, enum: Object.values(Constants.LogTypes) },
    content: { type: String, default: '' },
    payload: {
      product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
      order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' }
    },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    business: { type: mongoose.Schema.Types.ObjectId, ref: 'Business' },
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
Log.plugin(deepPopulate)
Log.statics = statics
module.exports = mongoose.model('Log', Log)
