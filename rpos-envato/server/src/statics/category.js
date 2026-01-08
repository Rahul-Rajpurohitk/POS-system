import _ from 'lodash'
import { getFileUrl } from '../common/utils'
import Constants from '../common/constants'

function detailForGuest(category) {
  category = _.pick(category, ['_id', 'name', 'count', 'image', 'parent'])
  if (category.image) {
    category.image = getFileUrl(category.image)
  } else {
    category.image = Constants.DefaultProductImage
  }

  return category
}

function detailForOwner(category) {
  category = _.pick(category, ['_id', 'name', 'count', 'image', 'parent'])
  if (category.image) {
    category.image = getFileUrl(category.image)
  } else {
    category.image = Constants.DefaultProductImage
  }

  return category
}

function detailForAdmin(category) {
  category = _.pick(category, ['_id', 'name', 'count', 'image', 'parent', 'enable', 'createdAt'])
  if (category.image) {
    category.image = getFileUrl(category.image)
  } else {
    category.image = Constants.DefaultProductImage
  }

  return category
}

export default {
  detailForGuest,
  detailForOwner,
  detailForAdmin
}
