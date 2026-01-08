import _ from 'lodash'
const Business = require('../models/business')
const Log = require('../models/log')
require('mongoose-pagination')

async function updateBusiness(req, res, next) {
  try {
    const body = _.pick(req.body, ['name', 'tax', 'currency', 'language'])
    await Business.updateOne({ _id: req.business }, { $set: body })
    const business = await Business.findById(req.business)
    res.json(Business.detailForManager(business))
  } catch (error) {
    next(error)
  }
}

async function getLogs(req, res, next) {
  const page = req.query.page ? parseInt(req.query.page) : 1
  const limit = req.query.limit ? parseInt(req.query.limit) : 10
  const query = {
    business: req.business
  }
  Log.find(query)
    .deepPopulate(['payload.product', 'payload.order'])
    .sort({ createdAt: -1 })
    .paginate(page, limit, (err, docs, total) => {
      if (err) return next(err)
      res.status(200).json({ data: _.map(docs, Log.detailForManager), total })
    })
}

export default {
  updateBusiness,
  getLogs
}
