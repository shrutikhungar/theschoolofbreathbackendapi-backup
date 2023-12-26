const controller = require("../controllers/contact.controller")
const { Router } = require("express");
const { authorize, ADMIN, LOGGED_USER } = require("../utils/auth");
const cors = require('cors')

let router = Router();


router.route("/").get(cors(),controller.getContacts)



module.exports = router;
