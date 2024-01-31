const { Router } = require("express");
const controller = require("../controllers/upload.controller");

let router = Router();


router.route("/add").post(controller.upload.fields([{ name: 'audioFile', maxCount: 1 }, { name: 'imageFile', maxCount: 1 }]),controller.uploadFile) 
router.route("/edit/:musicId").put(controller.upload.fields([{ name: 'audioFile', maxCount: 1 }, { name: 'imageFile', maxCount: 1 }]),controller.editMusic) 
router.route("/delete/:musicId").delete(controller.deleteMusicFile) 
router.get('/file/:filename', controller.streamAudio);

module.exports = router;
