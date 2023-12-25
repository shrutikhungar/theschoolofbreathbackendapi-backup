const controller = require("../controllers/contact.controller")
const { Router } = require("express");
const { authorize, ADMIN, LOGGED_USER } = require("../utils/auth");


let router = Router();


router.route("/").get(controller.getContacts)



module.exports = router;
