const controller = require("../../controllers/chat/chat.controller")
const { Router } = require("express");
const { authorize} = require("../../utils/auth");
let router = Router();

// Get all topics
router.route("/topics").get(controller.topics)

// Get FAQ data by topic
router.route("/faq/:topic").get(controller.getFaqByTopic)

// Chat endpoint
router.route("/").post(authorize(), controller.chat)

// Get conversation history
router.route("/history/:sessionId").get(controller.getConversationHistory)

// Get user sessions
router.route("/sessions").get(controller.getUserSessions)

router.route("/analytics").get(controller.getAnalytics)

module.exports = router;
