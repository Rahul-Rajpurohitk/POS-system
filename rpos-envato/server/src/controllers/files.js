import { response, randomFileNameByExtension } from '../common/utils'
import path from 'path'
const File = require('../models/file')
const Constants = require('../common/constants')
const FileUtils = require('../common/file_utils')
require('mongoose-pagination')
const multer = require('multer')

const imageStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, Constants.FileStorage.server.imageDirectory)
  },
  filename: function (req, file, cb) {
    const extension = path.extname(file.originalname)
    cb(null, randomFileNameByExtension(extension))
  }
})

const upload = multer({
  storage: Constants.FileStorage.server.enabled ? imageStorage : multer.memoryStorage()
}).single('image')

async function uploadImage(req, res, next) {
  upload(req, res, function (err) {
    if (err) {
      next(err)
    } else {
      if (req.file) {
        FileUtils.uploadImageToStorage(req.file)
          .then((fileName) => {
            if (fileName) {
              const file = new File({ file: fileName, type: Constants.MediaType.Image })
              file.save((err, item) => {
                if (err) return res.status(500).send(err)
                res.status(200).json(item)
              })
            }
          })
          .catch(next)
      } else {
        res.status(400).json(response(false, {}, __('Empty image')))
      }
    }
  })
}

export default {
  uploadImage
}
