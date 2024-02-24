const controller = require("../controllers/music.controller");
const { Router } = require("express");
const { authorize, ADMIN, LOGGED_USER } = require("../utils/auth");


let router = Router();
/* router.route("/").get(authorize(), controller.getAll); */
router.route("/").get( controller.getAllAdmin); 
router.route("/favorites").get(authorize(), controller.getAllFavorites);
router.route("/favorites/category").get(authorize(), controller.getAllFavoritesByCategory);
router.route("/detail/:slug").get( controller.getOne);
router.route("/category").get(authorize(),controller.getMusicsByCategory);


module.exports = router;
