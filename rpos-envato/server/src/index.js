import helmet from 'helmet'
import multiCores from './multi-cores'
import { EventEmitter } from 'events'
import * as db from './common/db'
const express = require('express')
const path = require('path')
const cookieParser = require('cookie-parser')
const logger = require('morgan')

require('dotenv-flow').config()
const passport = require('passport')
const JwtStrategy = require('passport-jwt').Strategy
const ExtractJwt = require('passport-jwt').ExtractJwt
const i18n = require('./common/i18n')
const Constants = require('./common/constants')
const { response } = require('./common/utils')
const User = require('./models/user')

const mediator = new EventEmitter()
const app = express()
app.use(i18n.init)

// view engine setup
app.set('views', path.join(__dirname, 'views'))
app.set('view engine', 'pug')

app.use(helmet())
app.use(logger('dev'))
app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use(cookieParser())
app.use(express.static(path.join(__dirname, 'public')))
app.use(express.static(path.join(__dirname, 'apidoc')))
if (process.env.NODE_ENV !== 'production') {
  app.use(express.static(process.cwd() + '/apidoc'))
  app.get('/apidoc', (req, res) => {
    res.sendFile(path.join(process.cwd() + '/apidoc/index.html'))
  })
}
app.use(function (req, res, next) {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Methods', 'PUT, POST, GET, DELETE, PATCH')
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control, Pragma')
  res.header('Access-Control-Allow-Origin', '*')
  next()
})

multiCores(app, mediator)

mediator.once('boot.ready', async (server) => {
  console.log('SERVER BOOT READY')
  db.connect()

  // JWT configration
  const options = {}
  options.jwtFromRequest = ExtractJwt.fromAuthHeaderWithScheme('Bearer')
  options.secretOrKey = Constants.JWTSecret

  app.use(passport.initialize())

  // Configure Passport to use JWT strategy to look up Users.
  passport.use('Bearer', new JwtStrategy(options, function (jwt_payload, done) {
    User.findOne({
      _id: jwt_payload.id,
      enable: true
    }, function (err, user) {
      if (err) {
        return done(err, false)
      }
      if (user) {
        done(null, user)
      } else {
        done(null, false)
      }
    })
  }))

  // app.use(require('./middlewares/users'))
  app.use(require('./routes'))

  // catch 404 and forward to error handler
  app.use(function (req, res, next) {
    return res.status(404).jsonp(response(false, {}, 'Api not found'))
  })

  // error handler
  app.use(function (err, req, res, next) {
    console.log(err)
    return res.status(500).jsonp(response(false, {}, err.message))
  })
})

module.exports = app
