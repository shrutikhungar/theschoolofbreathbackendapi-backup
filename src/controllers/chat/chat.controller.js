
const { 
    getGeneralFAQs, 
    getMembershipFAQs, 
    getCourseFAQs, 
    getAppFAQs, 
    getTechnicalFAQs 
  } = require('../../data/faqData');
  const chatService = require('../../services/chatService');
exports.topics = async (req, res, next) => {
    try {
        const TOPICS = [
            {
              id: 1,
              title: "General FAQs",
              color: "#E8D1D1",
            },
            {
              id: 2,
              title: "Membership FAQs",
              color: "#F2E8E8",
            },
            {
              id: 3,
              title: "Course FAQs",
              color: "#D4B88C",
            },
            {
              id: 4,
              title: "App FAQs",
              color: "#F5F1E6",
            },
            {
              id: 5,
              title: "Technical FAQs",
              color: "#D3DCE1",
            },
            {
              id: 6,
              title: "Other Topics",
              color: "#E8D1D1",
            }
          ];
          
          res.status(200).json(TOPICS);
  
    } catch (error) {
      return next(error);
    }
  };


  // Get FAQ data by topic
  exports.getFaqByTopic = async (req, res, next) => {
    try {
        const topic = req.params.topic;
        let faqData = [];
        
        switch (topic) {
          case 'general':
            faqData = getGeneralFAQs();
            break;
          case 'membership':
            faqData = getMembershipFAQs();
            break;
          case 'course':
            faqData = getCourseFAQs();
            break;
          case 'app':
            faqData = getAppFAQs();
            break;
          case 'technical':
            faqData = getTechnicalFAQs();
            break;
          default:
            return res.status(404).json({ error: 'Topic not found' });
        }
        
        res.status(200).json(faqData);
    } catch (error) {
      return next(error);
    }
  };

  // Chat endpoint - Process user questions with MongoDB integration
  exports.chat = async (req, res, next) => {
    try {
        const { message, userId, sessionId } = req.body;
  
        if (!message || !message.trim()) {
          return res.status(400).json({ error: 'Message is required' });
        }
        
      
          // Extract useful metadata from the request
          const metadata = {
            ...req.metadata,
            platform: req.get('platform') || 'unknown',
            deviceType: req.get('device-type') || 'unknown'
          };
          
          // Process message and store in MongoDB
          const result = await chatService.processMessage(
            message, 
            userId, 
            sessionId,
            metadata
          );
          
          res.status(200).json({
            ...result.response,
            sessionId: result.sessionId
          });
      
    } catch (error) {
      return next(error);
    }
  };

  // Get conversation history
  exports.getConversationHistory = async (req, res, next) => {
    try {
        const { sessionId } = req.params;
        const { userId, limit } = req.query;
        
        if (!sessionId) {
          return res.status(400).json({ error: 'Session ID is required' });
        }
        
       
          const history = await chatService.getConversationHistory(
            sessionId,
            userId || null,
            limit ? parseInt(limit) : 50
          );
          
          res.status(200).json(history);
       
    } catch (error) {
      return next(error);
    }
  };

  // Get user sessions
  exports.getUserSessions = async (req, res, next) => {
    try {
        const { userId, activeOnly } = req.query;
  
        if (!userId) {
          return res.status(400).json({ error: 'User ID is required' });
        }
      
          const sessions = await chatService.getUserSessions(
            userId,
            activeOnly === 'true'
          );
          
          res.status(200).json(sessions);
       
    } catch (error) {
      return next(error);
    }
  };
  
// Get analytics
exports.getAnalytics = async (req, res, next) => {
    const { userId } = req.query;
  
    try {
      const analytics = await chatService.getAnalytics(userId || null);
      res.status(200).json(analytics);
    } catch (error) {
      console.error('Error retrieving analytics:', error);
      res.status(500).json({ error: 'Failed to retrieve analytics' });
    }
};



  
  


