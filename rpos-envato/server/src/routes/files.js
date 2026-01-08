import { auth } from '../middlewares'
const express = require('express')
const router = express.Router()
import FilesController from '../controllers/files'
/**
 * @api {post} /files/image Upload image
 * @apiVersion 1.0.0
 * @apiName Upload image
 * @apiGroup Files
 *
 * @apiParam {File} image
 *
 * @apiSuccess {String} _id
 * @apiSuccess {String} type
 * @apiSuccess {String} image
 * @apiSuccess {String} createdAt
 *
 */
router.post('/image', auth, FilesController.uploadImage)

module.exports = router
