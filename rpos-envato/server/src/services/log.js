import Constants from '../common/constants'
import { zeroPad } from '../common/utils'
const Log = require('../models/log')

const createNewProduct = async (product, user) => {
  const content = `<p><b>${user.firstName}</b> created <b>${product.name}</b>.</p>`
  const log = new Log({
    type: Constants.LogTypes.NewProduct,
    user: user._id,
    payload: { product: product._id },
    business: user.business,
    content
  })
  await log.save()
}

const editProduct = async (product, user) => {
  const content = `<p><b>${user.firstName}</b> changed <b>${product.name}</b>.</p>`
  const log = new Log({
    type: Constants.LogTypes.EditProduct,
    user: user._id,
    payload: { product: product._id },
    business: user.business,
    content
  })
  await log.save()
}

const createNewOrder = async (order, user) => {
  const content = `<p><b>${user.firstName}</b> created order <b>${zeroPad(order.number)}</b>.</p>`
  const log = new Log({
    type: Constants.LogTypes.NewOrder,
    user: user._id,
    payload: { order: order._id },
    business: user.business,
    content
  })
  await log.save()
}

export default {
  createNewProduct,
  editProduct,
  createNewOrder
}
