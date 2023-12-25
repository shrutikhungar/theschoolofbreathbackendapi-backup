const controller = require('../controllers/user.controller')
const { Router } = require('express')
const { authorize, ADMIN, LOGGED_USER } = require('../utils/auth');
let router = Router()

router
    .route('/me')
    .get(authorize(), controller.getOne)


router
    .route('/add-favorite/music/:music')
    .put(authorize(), controller.addFavoriteMusic)

module.exports = router
