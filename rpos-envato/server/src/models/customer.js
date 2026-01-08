import { getFileUrl } from '../common/utils'
const mongoose = require('mongoose')
const Schema = mongoose.Schema

const Customer = new Schema(
  {
    name: { type: String, default: '' },
    avatar: { type: String, default: '' },
    email: { type: String, default: '' },
    phone: { type: String, default: '' },
    address: { type: String, default: '' },
    business: { type: mongoose.Schema.Types.ObjectId, ref: 'Business' },
    enable: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now }
  }, {
    toObject: {
      transform: function (doc, ret, options) {
        delete ret.__v
        delete ret.business
        delete ret.enable
        delete ret.createdAt
        if (ret.avatar != '' && ret.avatar.indexOf('http') == -1 && ret.avatar.indexOf('https') == -1) {
          ret.avatar = getFileUrl(ret.avatar)
        }
        return ret
      }
    },
    toJSON: {
      transform: function (doc, ret, options) {
        delete ret.__v
        delete ret.business
        delete ret.enable
        delete ret.createdAt
        if (ret.avatar != '' && ret.avatar.indexOf('http') == -1 && ret.avatar.indexOf('https') == -1) {
          ret.avatar = getFileUrl(ret.avatar)
        }
        return ret
      }
    }
  })

module.exports = mongoose.model('Customer', Customer)
