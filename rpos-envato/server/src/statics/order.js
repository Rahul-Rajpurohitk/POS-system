import _ from 'lodash'
import Product from '../models/product'
import { zeroPad } from '../common/utils'

function detailForManager(order) {
  order = _.pick(order, [
    '_id',
    'number',
    'items',
    'coupon',
    'customer',
    'guest',
    'payment',
    'createdBy',
    'createdAt'
  ])
  order.number = zeroPad(order.number)
  order.items = _.map(order.items, (o) => ({
    ...o.toObject(),
    product: Product.detailForManager(o.product)
  }))

  return order
}

export default {
  detailForManager
}
