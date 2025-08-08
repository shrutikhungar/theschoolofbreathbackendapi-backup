const guideService = require('../services/guideService');

// Get all active guides
exports.getAllGuides = async (req, res, next) => {
    try {
        const guides = await guideService.getAllGuides();
        res.status(200).json(guides);
    } catch (error) {
        return next(error);
    }
};

// Get guide by ID
exports.getGuideById = async (req, res, next) => {
    try {
        const { guideId } = req.params;
        
        if (!guideId) {
            return res.status(400).json({ error: 'Guide ID is required' });
        }

        const guide = await guideService.getGuideById(guideId);
        
        if (!guide) {
            return res.status(404).json({ error: 'Guide not found' });
        }

        res.status(200).json(guide);
    } catch (error) {
        return next(error);
    }
};

// Get guide resources (GIFs for different states)
exports.getGuideResources = async (req, res, next) => {
    try {
        const { guideId } = req.params;
        
        if (!guideId) {
            return res.status(400).json({ error: 'Guide ID is required' });
        }

        const resources = await guideService.getGuideResources(guideId);
        res.status(200).json(resources);
    } catch (error) {
        if (error.message === 'Guide not found') {
            return res.status(404).json({ error: 'Guide not found' });
        }
        return next(error);
    }
};

// Select guide for a session
exports.selectGuide = async (req, res, next) => {
    try {
        const { guideId, sessionId, userEmail } = req.body;

        if (!guideId || !sessionId) {
            return res.status(400).json({ error: 'Guide ID and Session ID are required' });
        }

        // Validate guide exists
        const guide = await guideService.getGuideById(guideId);
        if (!guide) {
            return res.status(404).json({ error: 'Guide not found' });
        }

        // Update chat session with selected guide
        const ChatHistory = require('../models/chat.model');
        const session = await ChatHistory.findOne({ sessionId });
        
        if (session) {
            await session.updateGuide(guideId);
        }

        // Get guide resources for frontend
        const resources = await guideService.getGuideResources(guideId);

        res.status(200).json({
            success: true,
            message: 'Guide selected successfully',
            guide: {
                id: guide.id,
                name: guide.name,
                subtitle: guide.subtitle,
                avatarUrl: guide.avatarUrl,
                personality: guide.personality
            },
            resources: resources.resources
        });
    } catch (error) {
        return next(error);
    }
};

// Seed default guides (admin endpoint)
exports.seedGuides = async (req, res, next) => {
    try {
        const result = await guideService.seedDefaultGuides();
        res.status(200).json(result);
    } catch (error) {
        return next(error);
    }
}; 