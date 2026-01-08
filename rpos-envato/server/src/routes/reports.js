import Validation from '../validations/index'
import { manager, validator } from '../middlewares'
const express = require('express')
const router = express.Router()
import ReportsController from '../controllers/reports'

/**
* @api {get} /reports/daily Daily
* @apiVersion 1.0.0
* @apiName Daily
* @apiGroup Reports
*
* @apiParam {String} [date]
*
* @apiSuccess {String} _id
* @apiSuccess {String} number
* @apiSuccess {String} items
* @apiSuccess {String} coupon
* @apiSuccess {String} customer
* @apiSuccess {Object} guest
* @apiSuccess {Object} payment
*
*/
router.get('/daily', Validation.report.validateDaily, validator, manager, ReportsController.reportDaily)

/**
* @api {get} /reports/weekly Weekly
* @apiVersion 1.0.0
* @apiName Weekly
* @apiGroup Reports
*
* @apiSuccess {Object} data
*
*/
router.get('/weekly', manager, ReportsController.reportWeekly)

/**
* @api {get} /reports/monthly Monthly
* @apiVersion 1.0.0
* @apiName Monthly
* @apiGroup Reports
*
* @apiSuccess {Object} data
*
*/
router.get('/monthly', manager, ReportsController.reportMonthly)

/**
* @api {get} /reports/products Top Products
* @apiVersion 1.0.0
* @apiName Top Products
* @apiGroup Reports
*
* @apiParam {String} [limit]
*
* @apiSuccess {String} _id
* @apiSuccess {String} name
* @apiSuccess {Number} quantity
* @apiSuccess {Number} amount
* @apiSuccess {Number} profit
*
*/
router.get('/products', Validation.report.validateProduct, validator, manager, ReportsController.topProducts)

module.exports = router
