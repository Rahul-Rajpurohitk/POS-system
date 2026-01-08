const passport = require('passport')
const Constants = require('../common/constants')
const Business = require('../models/business')

module.exports = function (req, res, next) {
  passport.authenticate('Bearer', function (err, user, info) {
    if (err) return res.status(500).send(err)

    if (user && user.enable) {
      if (user.role === Constants.Role.Manager || user.role === Constants.Role.Staff) {
        Business.findOne({ _id: user.business, enable: true }, (err, item) => {
          if (err) return next(err)
          if (item) {
            req.business = user.business
            req.userId = user._id
            req.userInfo = user
            next()
          } else {
            res.status(401).json({ message: __('No Permission') })
          }
        })
      } else {
        res.status(401).json({ message: __('No Permission') })
      }
    } else {
      res.status(401).json({ message: __('Invalid credentials') })
    }
  })(req, res, next)
}
