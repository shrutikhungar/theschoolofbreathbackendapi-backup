const controller = require("../controllers/categories.controller")
const { Router } = require("express");


let router = Router();


router.route("/").get(controller.getCategories)
router.route("/add").post(controller.addCategories)
router.route("/delete/:id").delete(controller.deleteCategories)
router.route("/edit/:id").put(controller.editCategories)


module.exports = router;
