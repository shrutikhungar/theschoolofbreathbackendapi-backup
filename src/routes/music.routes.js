const controller = require("../controllers/music.controller");
const { Router } = require("express");
const { authorize, ADMIN, LOGGED_USER } = require("../utils/auth");


let router = Router();
/* router.route("/").get(authorize(), controller.getAll); */
router.route("/").get( controller.getAllAdmin); 
router.route("/favorites").get(authorize(), controller.getAllFavorites);
router.route("/detail/:slug").get(authorize(), controller.getOne);


module.exports = router;
