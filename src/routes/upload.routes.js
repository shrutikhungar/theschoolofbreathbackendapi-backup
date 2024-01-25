const { Router } = require("express");
const controller = require("../controllers/upload.controller");

let router = Router();


router.route("/").post(controller.upload.fields([{ name: 'audioFile', maxCount: 1 }, { name: 'imageFile', maxCount: 1 }]),controller.uploadFile) 
router.get('/file/:filename', controller.streamAudio);

module.exports = router;
