const controller = require("../controllers/contact.controller")
const { Router } = require("express");


let router = Router();


router.route("/").get(controller.getContacts)



module.exports = router;
