import _ from 'lodash'
import { getFileUrl } from '../common/utils'

function detailForAuth(user) {
  user = _.pick(user, ['_id', 'firstName', 'lastName', 'avatar', 'email', 'role', 'business'])
  user.avatar = getFileUrl(user.avatar)

  return user
}

export default {
  detailForAuth
}
