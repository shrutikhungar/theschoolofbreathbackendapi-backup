const { Router } = require("express");
const controller = require("../controllers/viedo.content.controller");
const { apiKeyAuth } = require("../utils/apiKeyAuth");

const router = Router();

//app
router.get("/videos", apiKeyAuth,controller.getVideos);



// Public routes
router.get("/",apiKeyAuth, controller.getAllVideoContent);
router.get("/:id",apiKeyAuth, controller.getVideoContentById);

// Protected routes
router.post("/", apiKeyAuth, controller.createVideoContent);
router.put("/:videoId",apiKeyAuth, controller.updateVideoContent);
router.delete("/:id", apiKeyAuth, controller.deleteVideoContent);
router.put("/position/bulk", apiKeyAuth, controller.updatePosition);
router.put("/favorite/:id", controller.toggleFavorite);




module.exports = router;