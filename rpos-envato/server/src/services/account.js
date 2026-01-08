const Business = require('../models/business')
const User = require('../models/user')

const getAuthUserInfo = async (userId) => {
  let user = await User.findById(userId).populate('business').exec()
  user = User.detailForAuth(user)
  user.business = Business.detailForManager(user.business)
  return user
}

export default {
  getAuthUserInfo
}
