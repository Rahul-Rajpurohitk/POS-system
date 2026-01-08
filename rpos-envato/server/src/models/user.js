import statics from '../statics/user'
const mongoose = require('mongoose')
const Schema = mongoose.Schema
const Constants = require('../common/constants')

const User = new Schema(
  {
    firstName: { type: String, default: '' },
    lastName: { type: String, default: '' },
    avatar: { type: String, default: '' },
    email: { type: String, default: '' },
    role: { type: String, default: Constants.Role.Manager },
    authType: { type: String, default: Constants.AuthType.Email },
    business: { type: mongoose.Schema.Types.ObjectId, ref: 'Business' },
    resetCode: { type: String, default: '' },
    hash: { type: String, default: '' },
    enable: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now }
  },
  {
    toObject: {
      transform: function (doc, ret, options) {
        delete ret.salt
        delete ret.hash
        delete ret.__v
      }
    },
    toJSON: {
      transform: function (doc, ret, options) {
        delete ret.salt
        delete ret.hash
        delete ret.__v
      }
    }
  }
)
User.statics = statics
module.exports = mongoose.model('User', User)
