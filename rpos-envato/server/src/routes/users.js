import Validation from '../validations/index'
import { auth, validator, manager } from '../middlewares'

import UsersController from '../controllers/users'
import AuthController from '../controllers/auth'
const express = require('express')
const router = express.Router()

/**
 * @api {post} /users/register Register
 * @apiVersion 1.0.0
 * @apiName Register
 * @apiGroup Auth
 *
 * @apiParam {String} firstName
 * @apiParam {String} lastName
 * @apiParam {String} email
 * @apiParam {String} [password]
 * @apiParam {String} [role] manager, staff or admin, default manager
 *
 * @apiSuccess {String} _id
 * @apiSuccess {String} firstName
 * @apiSuccess {String} lastName
 * @apiSuccess {String} email
 * @apiSuccess {String} avatar
 * @apiSuccess {String} authType
 * @apiSuccess {String} role
 *
 */
router.post('/register', Validation.auth.validateRegister, validator, AuthController.register)

/**
 * @api {post} /users/login Login
 * @apiVersion 1.0.0
 * @apiName Login
 * @apiGroup Auth
 *
 * @apiParam {String} email
 * @apiParam {String} password
 *
 * @apiSuccess {String} _id
 * @apiSuccess {String} firstName
 * @apiSuccess {String} lastName
 * @apiSuccess {String} email
 * @apiSuccess {String} avatar
 * @apiSuccess {String} role
 * @apiSuccess {String} token
 *
 */
router.post('/login', Validation.auth.validateLogin, validator, AuthController.login)

/**
 * @api {put} /users Update user
 * @apiVersion 1.0.0
 * @apiName Update user
 * @apiGroup User
 *
 * @apiHeader [Authorization] Bearer token
 *
 * @apiParam {String} [firstName]
 * @apiParam {String} [lastName]
 * @apiParam {String} [avatar] file name of image
 *
 * @apiSuccess {String} _id
 * @apiSuccess {String} firstName
 * @apiSuccess {String} lastName
 * @apiSuccess {String} email
 * @apiSuccess {String} avatar
 * @apiSuccess {String} authType
 * @apiSuccess {String} role
 *
 */

router.put('/', auth, Validation.user.validateUpdateUser, validator, UsersController.updateUser)

/**
 * @api {put} /users/change_password Change Password
 * @apiVersion 1.0.0
 * @apiName Change Password
 * @apiGroup User
 *
 * @apiParam {String} oldPass
 * @apiParam {String} newPass
 * @apiParam {String} confirmPass
 *
 * @apiHeader [Authorization] Bearer token
 *
 * @apiSuccess {Boolean} success
 *
 */

router.put(
  '/change_password',
  Validation.user.validateChangePass,
  validator,
  auth,
  UsersController.changePassword
)

/**
 * @api {post} /users/staff Add staff
 * @apiVersion 1.0.0
 * @apiName Add staff
 * @apiGroup User
 *
 * @apiHeader [Authorization] Bearer token
 *
 * @apiParam {String} [firstName]
 * @apiParam {String} [lastName]
 * @apiParam {String} [email]
 * @apiParam {String} [password]
 *
 * @apiSuccess {String} _id
 * @apiSuccess {String} firstName
 * @apiSuccess {String} lastName
 * @apiSuccess {String} email
 * @apiSuccess {String} avatar
 * @apiSuccess {String} role
 *
 */

router.post(
  '/staff',
  Validation.auth.validateRegister,
  validator,
  manager,
  UsersController.addStaff
)

/**
 * @api {put} /users/staff/:id Edit staff
 * @apiVersion 1.0.0
 * @apiName Edit staff
 * @apiGroup User
 *
 * @apiHeader [Authorization] Bearer token
 *
 * @apiParam {String} [firstName]
 * @apiParam {String} [lastName]
 * @apiParam {String} [email]
 * @apiParam {String} [role]
 *
 * @apiSuccess {String} _id
 * @apiSuccess {String} firstName
 * @apiSuccess {String} lastName
 * @apiSuccess {String} email
 * @apiSuccess {String} avatar
 * @apiSuccess {String} role
 *
 */

router.put(
  '/staff/:id',
  Validation.user.validateUpdateStaff,
  validator,
  manager,
  UsersController.editStaff
)

/**
 * @api {get} /users/staff Get staff
 * @apiVersion 1.0.0
 * @apiName Get staff
 * @apiGroup User
 *
 * @apiHeader [Authorization] Bearer token
 *
 * @apiSuccess {String} _id
 * @apiSuccess {String} firstName
 * @apiSuccess {String} lastName
 * @apiSuccess {String} email
 * @apiSuccess {String} avatar
 * @apiSuccess {String} role
 *
 */
router.get('/staff', manager, UsersController.getStaffs)

/**
 * @api {delete} /users/staff/:id Delete staff
 * @apiVersion 1.0.0
 * @apiName Delete staff
 * @apiGroup User
 *
 * @apiHeader Authorization Bearer token
 *
 *
 * @apiSuccess {Boolean} success
 *
 */

router.delete(
  '/staff/:id',
  Validation.user.validateDeleteStaff,
  validator,
  manager,
  UsersController.deleteStaff
)

module.exports = router
