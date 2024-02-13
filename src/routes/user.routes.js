const controller = require('../controllers/user.controller')
const { Router } = require('express')
const { authorize, ADMIN, LOGGED_USER } = require('../utils/auth');
let router = Router()

router
    .route('/me')
    .get(authorize(), controller.getOne)

router
    .route('/updateSubscriptionStatus')
    .put(authorize(), controller.updateSubscriptionStatus)


router
    .route('/add-favorite/music/:music')
    .put(authorize(), controller.addFavoriteMusic)

 router
    .route('/add-favorite/video/:video')
    .put(authorize(), controller.addFavoriteVideo)    

module.exports = router
