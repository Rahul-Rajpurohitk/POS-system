const mongoose = require('mongoose')
const Schema = mongoose.Schema
const Constants = require('../common/constants')

const File = new Schema(
  {
    type: { type: String, default: Constants.MediaType.Image },
    file: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now }
  }, {
    toObject: {
      transform: function (doc, ret, options) {
        delete ret.__v
        delete ret._id
        delete ret.createdAt
        return ret
      }
    },
    toJSON: {
      transform: function (doc, ret, options) {
        delete ret.__v
        delete ret._id
        delete ret.createdAt
        return ret
      }
    }
  })

module.exports = mongoose.model('File', File)
