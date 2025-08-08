const express = require('express');
const router = express.Router();
const controller = require('../controllers/guide.controller');

// Get all active guides
router.get('/', controller.getAllGuides);

// Get guide by ID
router.get('/:guideId', controller.getGuideById);

// Get guide resources (GIFs for different states)
router.get('/:guideId/resources', controller.getGuideResources);

// Select guide for a session
router.post('/select', controller.selectGuide);

// Seed default guides (admin endpoint)
router.post('/seed', controller.seedGuides);

module.exports = router; 