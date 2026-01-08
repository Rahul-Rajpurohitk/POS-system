const express = require('express')
const router = express.Router()
import AssetsController from '../controllers/assets'

router.get('*', AssetsController.getAsset)

module.exports = router
