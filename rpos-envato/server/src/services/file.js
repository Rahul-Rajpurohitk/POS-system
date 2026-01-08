import { getFileInfo } from '../common/utils'

const File = require('../models/file')

const checkFileFromClient = async (image) => {
  const { fileName } = getFileInfo(image)
  if (fileName) {
    return File.findOne({ file: fileName }).then(item => {
      if (!item) {
        return Promise.reject(image + ' not found')
      }
    })
  } else {
    return Promise.resolve()
  }
}

export default {
  checkFileFromClient
}
