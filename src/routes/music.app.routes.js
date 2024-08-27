const controller = require("../controllers/music.app.controller");
const { Router } = require("express");
const { authorize } = require("../utils/auth");


let router = Router();

router.route("/favorites").get(authorize(), controller.getAllFavoritesByCategory);
router.route("/preview").get( controller.getPreviewMusicsByCategory);
router.route("/category").get(authorize(),controller.getMusicsByCategory);


module.exports = router;
