/* eslint-disable no-unreachable */
import http from 'http'
import Constants from './common/constants'
const fs = require('fs')

const env = process.env

export default (app, mediator) => {
  validatePort()
  const server = http.createServer(app).listen(env.PORT)

  setImmediate(() => {
    mediator.emit('boot.ready', server)
  })

  server.on('error', onError)
  handleSigInt(server)
  handleMessages()
  if (Constants.FileStorage.server.enabled) {
    validateFileDirectory()
  }
}

function validatePort () {
  if (!env.PORT) {
    console.log('\x1b[31m', '*** PLEASE SET PORT in .env file', '\x1b[0m')
    throw new Error('\x1b[31m', '*** PLEASE SET PORT in .env file')
    process.exit(1)
  }
}

function validateFileDirectory () {
  if (!fs.existsSync(Constants.FileStorage.server.imageDirectory)) {
    fs.mkdirSync(Constants.FileStorage.server.imageDirectory)
  }
}

function handleSigInt (server) {
  process.on('SIGINT', () => {
    console.info('SIGINT signal received.')

    server.close(function (err) {
      if (err) {
        console.error(err)
        process.exit(1)
      }
    })
  })
}

function handleMessages () {
  process.on('message', (msg) => {
    if (msg === 'shutdown') {
      console.log('Closing all connections...')
      setTimeout(() => {
        console.log('Finished closing connections')
        process.exit(0)
      }, 1500)
    }
  })
}

function onError (error) {
  if (error.syscall !== 'listen') {
    throw error
  }

  switch (error.code) {
    case 'EACCES':
      console.error(`Pipe ${env.PORT} requires elevated privileges`)
      process.exit(1)
      break
    case 'EADDRINUSE':
      console.error(`Port ${env.PORT} is already in use`)
      process.exit(1)
      break
    default:
      throw error
  }
}
