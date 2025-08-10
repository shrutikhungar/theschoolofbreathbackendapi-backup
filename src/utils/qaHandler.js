// utils/qaHandler.js - Updated with MongoDB integration and Gemini API
const Fuse = require('fuse.js');
const axios = require('axios');
const FAQ = require('../models/faq.model');
const Course = require('../models/courses.model');
const guideService = require('../services/guideService');
const aiService = require('../services/aiService');

// Function to search the knowledge base using Fuse.js
function searchKnowledgeBase(entries, query) {
  const options = {
    keys: ['question', 'answer', 'keywords'],
    includeScore: true,
    threshold: 0.4, // Adjust threshold for fuzziness (0.0 = exact match, 1.0 = match anything)
  };
  const fuse = new Fuse(entries, options);
  const results = fuse.search(query);
  
  if (results.length > 0) {
    // Return the raw Fuse results (up to 3)
    return results.slice(0, 3);
  } else {
    return [];
  }
}

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
    // First try to find an answer in MongoDB knowledge base
    const allFAQs = await FAQ.find({}).lean(); // Get all FAQs from MongoDB
    
    // Use the searchKnowledgeBase function
    const results = searchKnowledgeBase(allFAQs, query);
    
    // Return the best match if it exists and has a good score
    if (results.length > 0 && results[0].score < 0.4) {
      // Track this FAQ view in the database
      await FAQ.findByIdAndUpdate(results[0].item._id, { 
        $inc: { views: 1 },
        $set: { lastAccessed: new Date() }
      });
      
      return {
        answer: results[0].item.answer,
        backgroundColor: results[0].item.backgroundColor,
        source: 'knowledge_base', // Indicates answer came from our knowledge base
        faqId: results[0].item._id,
        category: results[0].item.category
      };
    }
    
    // If no local match found, use Gemini with guide-specific personality
    const geminiResponse = await getGeminiResponseWithFallback(query, selectedGuide);
    return geminiResponse;
  } catch (error) {
    console.error('Error handling question:', error);
    return {
      answer: "I apologize, but I'm having trouble processing your question right now. Please try again later.",
      backgroundColor: "#F2E8E8", // Default error background color
      source: 'error' // Indicates an error occurred
    };
  }
}

// Function to get answer from Gemini with guide-specific personality and fallback
async function getGeminiResponseWithFallback(query, selectedGuide = 'abhi') {
  try {
    // Build context
    const context = await buildContext(query);
    
    // Get guide-specific system prompt
    const systemPrompt = await guideService.getGuideSystemPrompt(selectedGuide);
    
    // Generate Gemini response
    const response = await aiService.generateResponse(
      query, 
      systemPrompt,
      context,
      selectedGuide
    );

    // Validate response quality
    if (isResponseValid(response)) {
      return {
        answer: response,
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
  const [contextFAQs, courses] = await Promise.all([
    FAQ.find({
      $or: [
        { question: { $regex: query, $options: 'i' } },
        { answer: { $regex: query, $options: 'i' } }
      ]
    }).lean(),
    Course.find().limit(15).lean()
  ]);

  const context = contextFAQs.map(faq => 
    `Q: ${faq.question}\nA: ${faq.answer}`
  ).join('\n\n');
  
  const contextCourses = courses.map(course => 
    `- ${course.title}: ${course.description}`
  ).join('\n');

  return `${context}\n\nCOURSES:\n${contextCourses}`;
}

// Function to validate response quality
function isResponseValid(response) {
  return response && 
         response.length > 10 && 
         response.length < 500 &&
         !response.includes('I apologize') &&
         !response.includes('trouble');
}

// Function to get fallback response when AI fails
function getFallbackResponse(error, selectedGuide) {
  const fallbacks = {
    abhi: "I'm here to help with your wellness journey. Could you rephrase your question or ask about meditation, breathwork, or our courses? 🌟",
    ganesha: "Let me offer you wisdom from ancient practices. Please share your question again, and I'll guide you with spiritual knowledge. 🕉️"
  };

  return {
    answer: fallbacks[selectedGuide] || fallbacks.abhi,
    backgroundColor: "#F2E8E8",
    source: 'fallback',
    confidence: 'low'
  };
}

// New function to log unanswered questions for future FAQ creation
async function logUnansweredQuestion(question, userId = null) {
  try {
    // In a real implementation, you might save this to an UnansweredQuestions collection
    console.log(`Unanswered question logged: "${question}" from user ${userId || 'anonymous'}`);
    // Could also send notification to admin about potential FAQ gap
  } catch (error) {
    console.error('Error logging unanswered question:', error);
  }
}

// Function to check if the response is pending
function isResponsePending(response) {
  return response === null;
}

module.exports = {
  handleUserQuestion,
  getGeminiResponseWithFallback,
  logUnansweredQuestion,
  isResponsePending,
  searchKnowledgeBase
};