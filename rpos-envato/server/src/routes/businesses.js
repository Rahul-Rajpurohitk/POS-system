import Validation from '../validations/index'
import { validator, manager, auth } from '../middlewares'

import BusinessesController from '../controllers/businesses'
const express = require('express')
const router = express.Router()

/**
 * @api {put} /businesses Update Business
 * @apiVersion 1.0.0
 * @apiName Update Business
 * @apiGroup Businesses
 *
 * @apiParam {String} [name]
 * @apiParam {String} [tax]
 * @apiParam {String} [currency]
 * @apiParam {String} [language]
 *
 */
router.put(
  '/',
  Validation.business.validateUpdateBusinesses,
  validator,
  manager,
  BusinessesController.updateBusiness
)

/**
 * @api {get} /businesses/logs Get Business's Logs
 * @apiVersion 1.0.0
 * @apiName Get Business's Logs
 * @apiGroup Businesses
 *
 * @apiParam {String} [name]
 * @apiParam {String} [tax]
 * @apiParam {String} [currency]
 * @apiParam {String} [language]
 *
 */
router.get('/logs', auth, BusinessesController.getLogs)

module.exports = router
