import _ from 'lodash'
import { getFileUrl } from '../common/utils'
import Constants from '../common/constants'

function detailForGuest(product) {
  product = _.pick(product, [
    '_id',
    'name',
    'sku',
    'category',
    'desc',
    'quantity',
    'sellingPrice',
    'images'
  ])
  if (product.images && product.images.length > 0) {
    product.images = _.map(product.images, getFileUrl)
  } else {
    product.images = [Constants.DefaultProductImage]
  }

  return product
}

function detailForManager(product) {
  product = _.pick(product, [
    '_id',
    'name',
    'sku',
    'category',
    'desc',
    'quantity',
    'sellingPrice',
    'purchasePrice',
    'images',
    'sellingInfo',
    'createdAt'
  ])
  if (product.images && product.images.length > 0) {
    product.images = _.map(product.images, getFileUrl)
  } else {
    product.images = [Constants.DefaultProductImage]
  }

  return product
}

export default {
  detailForGuest,
  detailForManager
}
