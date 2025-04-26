// utils/qaHandler.js - Updated with MongoDB integration
const Fuse = require('fuse.js');
const axios = require('axios');
const FAQ = require('../models/faq.model');

// Main handler function for user questions
async function handleUserQuestion(query) {
  try {
    // First try to find an answer in MongoDB knowledge base
    const allFAQs = await FAQ.find({}).lean(); // Get all FAQs from MongoDB
    
    // Configure Fuse.js for fuzzy search
    const fuseOptions = {
      keys: ['question', 'answer'], // Search both questions and answers
      threshold: 0.4,
      includeScore: true,
      minMatchCharLength: 3,
      ignoreLocation: true,
      shouldSort: true
    };
    
    const fuse = new Fuse(allFAQs, fuseOptions);
    const results = fuse.search(query);
    
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
    
    // If no local match found, use OpenAI
    const openAIResponse = await getOpenAIResponse(query);
    return {
      answer: openAIResponse,
      backgroundColor: "#E8D1D1", // Default background color for AI responses
      source: 'openai', // Indicates answer came from OpenAI
      isFallback: true // Flag to indicate this was a fallback response
    };
  } catch (error) {
    console.error('Error handling question:', error);
    return {
      answer: "I apologize, but I'm having trouble processing your question right now. Please try again later.",
      backgroundColor: "#F2E8E8", // Default error background color
      source: 'error' // Indicates an error occurred
    };
  }
}

// Enhanced OpenAI response function with context from FAQs
async function getOpenAIResponse(query) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      console.error('OpenAI API key not found');
      return "I apologize, but I'm having trouble accessing my knowledge base right now. Please try asking your question in a different way or try again later.";
    }
    
    // Get relevant FAQs to provide as context to OpenAI
    const contextFAQs = await FAQ.find({
      $or: [
        { question: { $regex: query, $options: 'i' } },
        { answer: { $regex: query, $options: 'i' } }
      ]
    }).limit(3).lean();
    
    const context = contextFAQs.map(faq => 
      `Q: ${faq.question}\nA: ${faq.answer}`
    ).join('\n\n');
    
    const messages = [
      {
        role: "system",
        content: `You are Abhi, a 43-year-old mental health expert and founder of Meditate with Abhi and The School of Breath. 
        You blend ancient yogic wisdom with modern neuroscience. Keep responses concise, warm, and focused on meditation, 
        breathwork, and wellness. Here's some relevant context from our knowledge base:
        ${context}`
      },
      {
        role: "user",
        content: query
      }
    ];
    
    const response = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: "gpt-3.5-turbo",
      messages: messages,
      max_tokens: 500,
      temperature: 0.7
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      }
    });
    
    return response.data.choices[0].message.content.trim();
  } catch (error) {
    console.error('Error getting OpenAI response:', error);
    return "I apologize, but I'm having trouble connecting to my knowledge base right now. Please try asking your question in a different way or try again later.";
  }
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

module.exports = {
  handleUserQuestion,
  getOpenAIResponse,
  logUnansweredQuestion
};