const controller = require('../controllers/auth.controller')
const { Router } = require('express')
const oAuthLogin = require('../utils/auth').oAuth;
const { authorize, ADMIN, LOGGED_USER } = require('../utils/auth');

let router = Router()

router
    .route('/register')
    .post(controller.store)

router
    .route('/login')
    .post(controller.login)

router
    .route('/update/password')
    .put(authorize(LOGGED_USER), controller.updatePassword)

router
    .route('/restore/password/:email?')
    .get(controller.getRestorePasswordUrl)
    .put(controller.restorePassword)





module.exports = router
