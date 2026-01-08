const bcrypt = require('bcrypt')
const User = require('../models/user')
const Constants = require('../common/constants')
require('mongoose-pagination')

async function updateUser(req, res, next) {
  User.findOneAndUpdate({ _id: req.userId }, { $set: req.body }, (err, item) => {
    if (err) return next(err)
    User.findById(req.userId, (err, user) => {
      if (err) return next(err)
      res.status(200).json(user)
    })
  })
}

async function changePassword(req, res, next) {
  User.findById(req.userId, (err, user) => {
    if (err) return res.status(500).send(err)
    if (bcrypt.compareSync(req.body.oldPass, user.hash)) {
      User.findOneAndUpdate(
        { _id: req.userId },
        { $set: { hash: bcrypt.hashSync(req.body.newPass, 10) } },
        (err, item) => {
          if (err) return res.status(500).send(err)
          res.status(200).json({ success: true })
        }
      )
    } else {
      res.status(400).send({ message: __('The password is incorrect.') })
    }
  })
}

async function addStaff(req, res, next) {
  const hash = bcrypt.hashSync(req.body.password, 10)
  const user = new User({
    ...req.body,
    hash,
    role: Constants.Role.Staff,
    business: req.business
  })
  user.save((err, user) => {
    if (err) return next(err)
    res.send(user)
  })
}

async function editStaff(req, res, next) {
  User.findOneAndUpdate({ _id: req.params.id }, { $set: req.body }, (err, item) => {
    if (err) return next(err)
    User.findById(req.params.id, (err, user) => {
      if (err) return next(err)
      res.json(user)
    })
  })
}

async function getStaffs(req, res, next) {
  User.find({ role: Constants.Role.Staff, business: req.business, enable: true }, (err, items) => {
    if (err) return next(err)
    res.send(items)
  })
}

async function deleteStaff(req, res, next) {
  User.update({ _id: req.params.id }, { $set: { enable: false } }, (err) => {
    if (err) return next(err)
    res.json({ success: true })
  })
}

export default {
  updateUser,
  changePassword,
  addStaff,
  editStaff,
  getStaffs,
  deleteStaff
}
