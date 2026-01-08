import Validation from '../validations/index'
import { manager, validator, auth } from '../middlewares'
import CategoriesController from '../controllers/categories'
import ProductsController from '../controllers/products'
const express = require('express')
const router = express.Router()

/**
 * @api {get} /markets/categories Get Categories
 * @apiVersion 1.0.0
 * @apiName Get Categories
 * @apiGroup Markets
 *
 */
router.get('/categories', CategoriesController.getMarketCategories)

/**
 * @api {get} /markets/products Get Products
 * @apiVersion 1.0.0
 * @apiName Get Products
 * @apiGroup Markets
 *
 * @apiParam {String} [search]
 * @apiParam {String} [category]
 * @apiParam {String} [page]
 * @apiParam {String} [limit]
 */
router.get(
  '/products',
  Validation.product.validateGet,
  validator,
  ProductsController.getMarketProducts
)

module.exports = router
