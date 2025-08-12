// utils/qaHandler.js - Updated with MongoDB integration and Gemini API
const FAQ = require('../models/faq.model');
const Course = require('../models/courses.model');
const aiService = require('../services/aiService');
const guideService = require('../services/guideService');

// Main handler function for user questions
async function handleUserQuestion(query, selectedGuide = 'abhi') {
  // Check for greetings
  const greetingKeywords = ["hello", "hi", "hey", "good morning", "good afternoon", "good evening"];
  const lowerCaseQuery = query.toLowerCase().trim();
  if (greetingKeywords.includes(lowerCaseQuery)) {
    const greetings = ["Hello there! How can I help you today?", "Hi! What's on your mind?", "Hey! Ask me anything about The School of Breath."];
    return {
      answer: greetings[Math.floor(Math.random() * greetings.length)],
      backgroundColor: "#E8D1D1",
      source: 'greeting'
    };
  }

  try {
    // First try to find an answer in MongoDB knowledge base using simple search
    const allFAQs = await FAQ.find({}).lean();
    const simpleMatch = findSimpleMatch(allFAQs, query);
    
    if (simpleMatch) {
      console.log('🎯 Using local FAQ match');
      // Track this FAQ view in the database
      await FAQ.findByIdAndUpdate(simpleMatch._id, { 
        $inc: { views: 1 },
        $set: { lastAccessed: new Date() }
      });
      
      // Clean the FAQ response to remove \n characters and newlines
      const cleanedAnswer = cleanAIResponse(simpleMatch.answer);
      
      // Return cleaned FAQ answer without enhancement
      return {
        answer: cleanedAnswer,
        backgroundColor: simpleMatch.backgroundColor,
        source: 'knowledge_base',
        faqId: simpleMatch._id,
        category: simpleMatch.category
      };
    }
    
    console.log('🤖 No local match found, using Gemini with context');
    // If no local match found, use Gemini with context
    const geminiResponse = await getGeminiResponseWithFallback(query, selectedGuide);
    return geminiResponse;
  } catch (error) {
    console.error('Error handling question:', error);
    return {
      answer: "I apologize, but I'm having trouble processing your question right now. Please try again later.",
      backgroundColor: "#F2E8E8",
      source: 'error'
    };
  }
}

// Function to enhance answers with additional resources and information
function enhanceAnswerWithResources(answer, category) {
  const websiteInfo = " For more information, visit our website: https://www.meditatewithabhi.com";
  const youtubeInfo = " Check out our YouTube channel: https://www.youtube.com/@meditatewithabhi";
  const dashboardInfo = " Access your courses: https://www.meditatewithabhi.com/dashboard/en/login";
  
  let enhancedAnswer = answer;
  
  // Add category-specific enhancements
  if (category === 'general' || category === 'getting-started') {
    enhancedAnswer += " Getting Started: Visit our website to explore courses, check your email for access, reset password if needed at dashboard, join our community for support.";
  }
  
  if (category === 'courses' || category === 'membership') {
    enhancedAnswer += " Course Access: All courses available in app and web dashboard, Holistic Awakening members get full access, premium content for enhanced learning, track progress.";
  }
  
  if (category === 'meditation' || category === 'breathwork') {
    enhancedAnswer += " Practice Resources: Daily guided sessions, expert-led techniques, progressive programs, community practice sessions.";
  }
  
  // Always add website and YouTube information
  enhancedAnswer += websiteInfo + youtubeInfo + dashboardInfo;
  
  // Add general encouragement
  enhancedAnswer += " Need more help? Ask me about meditation, breathwork, or courses. I'm here to support your wellness journey!";
  
  return enhancedAnswer;
}

// Simple matching function - just check for exact matches
function findSimpleMatch(faqs, query) {
  const queryLower = query.toLowerCase();
  
  console.log('🔍 Searching for:', query);
  
  // Only look for exact or very close matches
  const exactMatch = faqs.find(faq => {
    const searchText = `${faq.question} ${faq.answer}`.toLowerCase();
    return searchText.includes(queryLower);
  });
  
  if (exactMatch) {
    console.log('✅ Exact match found:', exactMatch.question);
    return exactMatch;
  }
  
  console.log('❌ No exact match found, will use Gemini');
  return null;
}

// Function to clean AI response from unwanted characters
function cleanAIResponse(response) {
  if (!response) return response;
  
  return response
    .replace(/\\n/g, ' ') // Remove \n characters
    .replace(/\n/g, ' ') // Remove actual newlines
    .replace(/🌼|🌟|🕉️|🧘|📚|💻|🌐|📺|💫|🚀|📖|✨|💡|🎯|🤖|📚|🔍|✅|❌/g, '') // Remove emojis
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .trim(); // Remove leading/trailing spaces
}

// Function to get answer from Gemini with context
async function getGeminiResponseWithFallback(query, selectedGuide = 'abhi') {
  try {
    // Build context
    const context = await buildContext(query);
    
    // Get guide-specific system prompt
    const systemPrompt = await guideService.getGuideSystemPrompt(selectedGuide);
    
    // Generate Gemini response with context
    const response = await aiService.generateResponse(
      query, 
      systemPrompt,
      context,
      selectedGuide
    );

    // Clean the AI response
    const cleanedResponse = cleanAIResponse(response);

    // Validate response quality
    if (isResponseValid(cleanedResponse)) {
      // Return clean AI response without additional resources
      return {
        answer: cleanedResponse,
        backgroundColor: "#E8D1D1",
        source: 'gemini',
        confidence: 'high'
      };
    }

    // Fallback response if validation fails
    return getFallbackResponse(new Error('Invalid response'), selectedGuide);

  } catch (error) {
    console.error('Gemini response failed:', error);
    return getFallbackResponse(error, selectedGuide);
  }
}

// Helper function to build context from FAQs and courses
async function buildContext(query) {
  // Get all FAQs and courses for comprehensive context
  const [allFAQs, courses] = await Promise.all([
    FAQ.find({}).lean(),
    Course.find().limit(20).lean()
  ]);

  console.log(`📚 Building context with ${allFAQs.length} FAQs and ${courses.length} courses`);

  // Build comprehensive context with enhanced information
  const context = allFAQs.map(faq => 
    `Q: ${faq.question}\nA: ${faq.answer}\nKeywords: ${faq.keywords ? faq.keywords.join(', ') : 'N/A'}`
  ).join('\n\n');
  
  const contextCourses = courses.map(course => 
    `Course: ${course.title}\nDescription: ${course.description}\nType: ${course.type}\nAccess Tags: ${course.accessTags ? course.accessTags.join(', ') : 'N/A'}`
  ).join('\n\n');

  // Add website and resource information to context
  const resourceInfo = `
IMPORTANT RESOURCES:
- Website: https://www.meditatewithabhi.com
- Dashboard: https://www.meditatewithabhi.com/dashboard/en/login
- YouTube: https://www.youtube.com/@meditatewithabhi
- Support Email: connect@meditatewithabhi.com

GETTING STARTED INSTRUCTIONS:
- Check email for "Important: Your Access to Training"
- Reset password at dashboard if needed
- Access courses through app or web dashboard
- Holistic Awakening members get full access
- Premium content available for enhanced learning
`;

  return `${context}\n\nCOURSES:\n${contextCourses}\n\n${resourceInfo}`;
}

// Function to validate AI response quality
function isResponseValid(response) {
  return response && 
         response.length > 10 && 
         response.length < 800 &&
         !response.includes('I apologize') &&
         !response.includes('I\'m sorry') &&
         !response.includes('I don\'t have') &&
         !response.includes('I cannot') &&
         !response.includes('I\'m unable') &&
         !response.includes('trouble');
}

// Function to get fallback response when AI fails
function getFallbackResponse(error, selectedGuide) {
  const fallbacks = {
    abhi: `I'm here to help with your wellness journey! Here are some ways I can assist you: Answer questions about meditation and breathwork, guide you through courses and programs, help with getting started and access issues, provide information about our community. Quick Resources: Website: https://www.meditatewithabhi.com, YouTube: https://www.youtube.com/@meditatewithabhi, Dashboard: https://www.meditatewithabhi.com/dashboard/en/login. Could you rephrase your question or ask about something specific?`,
    
    ganesha: `Let me offer you wisdom from ancient practices. I can guide you with: Spiritual knowledge and practices, meditation techniques, breathwork wisdom, course information and access. Quick Resources: Website: https://www.meditatewithabhi.com, YouTube: https://www.youtube.com/@meditatewithabhi, Dashboard: https://www.meditatewithabhi.com/dashboard/en/login. Please share your question again, and I'll guide you with spiritual knowledge.`
  };

  return {
    answer: fallbacks[selectedGuide] || fallbacks.abhi,
    backgroundColor: "#F2E8E8",
    source: 'fallback',
    confidence: 'low'
  };
}

// Function to log unanswered questions for analysis
async function logUnansweredQuestion(question, userId = null) {
  try {
    // This could be implemented to track what questions aren't being answered
    console.log('Unanswered question:', { question, userId, timestamp: new Date() });
  } catch (error) {
    console.error('Error logging unanswered question:', error);
  }
}

// Function to check if a response is pending
function isResponsePending(response) {
  return response && response.includes('I\'m processing') || response.includes('Let me check');
}

module.exports = {
  handleUserQuestion,
  getGeminiResponseWithFallback,
  logUnansweredQuestion,
  isResponsePending,
  enhanceAnswerWithResources,
  cleanAIResponse
};