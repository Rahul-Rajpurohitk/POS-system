import _ from 'lodash'
import Product from '../models/product'
import Order from '../models/order'

function detailForManager(log) {
  log = _.pick(log, ['_id', 'type', 'content', 'payload', 'createdAt'])
  if (log.payload && log.payload.product) {
    log.payload.product = Product.detailForManager(log.payload.product)
  }
  if (log.payload && log.payload.order) {
    log.payload.order = Order.detailForManager(log.payload.order)
  }
  return log
}

export default {
  detailForManager
}
