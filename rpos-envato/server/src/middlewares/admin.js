const passport = require('passport')
const Constants = require('../common/constants')

module.exports = function (req, res, next) {
  passport.authenticate('Bearer', function (err, user, info) {
    if (err) return res.status(500).send(err)

    if (user && user.enable) {
      if (user.role === Constants.Role.Admin) {
        req.userId = user._id
        req.userInfo = user
        next()
      } else {
        res.status(401).json({ message: __('No Permission') })
      }
    } else {
      res.status(401).json({ message: __('Invalid credentials') })
    }
  })(req, res, next)
}
