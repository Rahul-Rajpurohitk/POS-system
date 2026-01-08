import _ from 'lodash'
import { getFileUrl } from '../common/utils'

function detailForManager(business) {
  business = _.pick(business, ['_id', 'name', 'currency', 'language', 'tax'])
  return business
}

export default {
  detailForManager
}
