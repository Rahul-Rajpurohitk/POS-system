import '@google-cloud/storage'
import path from 'path'
import { randomFileNameByExtension } from './utils'
import Constants from './constants'
const admin = require('firebase-admin')

const serviceAccount = require('./firebase/pos.json')

let bucket = null
if (Constants.FileStorage.firebase.enabled) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: 'gs://' + Constants.FileStorage.firebase.storageBucket
  })
  bucket = admin.storage().bucket()
}

function FileUtils() {}

FileUtils.uploadImageToStorage = (file) => {
  return new Promise((resolve, reject) => {
    if (file) {
      if (Constants.FileStorage.server.enabled) {
        resolve(file.filename)
      } else {
        try {
          const extension = path.extname(file.originalname)
          const fileUpload = bucket.file(randomFileNameByExtension(extension))
          fileUpload
            .save(new Buffer.from(file.buffer))
            .then(() => {
              resolve(fileUpload.name)
            })
            .catch(reject)
        } catch (error) {
          reject(error)
        }
      }
    } else {
      resolve(null)
    }
  })
}

FileUtils.deletImageStorage = (fileName) => {
  if (fileName && fileName.indexOf('http') === -1 && Constants.FileStorage.firebase.enabled) {
    bucket
      .file(fileName)
      .delete()
      .then(() => {})
      .catch((err) => {
        console.log(err)
      })
  }
}

module.exports = FileUtils
