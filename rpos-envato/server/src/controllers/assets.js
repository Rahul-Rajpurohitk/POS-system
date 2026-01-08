import Constants from '../common/constants'
const url = require('url')
const path = require('path')
const fs = require('fs')

async function getAsset(req, res, next) {
  const parsed = url.parse(req.url)
  const filePath = path.join(__dirname, '../..', Constants.FileStorage.server.imageDirectory)
  const fileName = path.basename(parsed.pathname)
  fs.readFile(filePath + '/' + fileName, function (err, content) {
    if (err) {
      res.writeHead(400, { 'Content-type': 'text/html' })
      res.end('No such image')
    } else {
      res.writeHead(200, { 'Content-type': 'image/jpg' })
      res.end(content)
    }
  })
}

export default {
  getAsset
}
