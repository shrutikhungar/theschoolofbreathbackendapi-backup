// utils/qaHandler.js - Updated with source tracking
const Fuse = require('fuse.js');
const axios = require('axios');
const { 
  getGeneralFAQs, 
  getMembershipFAQs, 
  getCourseFAQs, 
  getAppFAQs, 
  getTechnicalFAQs 
} = require('../data/faqData');

// Main handler function for user questions
async function handleUserQuestion(query) {
  try {
    // First try to find an answer in the knowledge base
    const allFAQs = [
      ...getGeneralFAQs(),
      ...getMembershipFAQs(),
      ...getCourseFAQs(),
      ...getAppFAQs(),
      ...getTechnicalFAQs()
    ];
    
    // First search with the full FAQ objects that include backgroundColor
    const fuseOptions = {
      keys: ['question'],
      threshold: 0.4,
      includeScore: true
    };
    
    const fuse = new Fuse(allFAQs, fuseOptions);
    const results = fuse.search(query);
    
    // Return the best match if it exists and has a good score
    if (results.length > 0 && results[0].score < 0.4) {
      return {
        answer: results[0].item.answer,
        backgroundColor: results[0].item.backgroundColor,
        source: 'local' // Indicates answer came from local knowledge base
      };
    }
    
    // If no local match found, use OpenAI with a default background color
    const openAIResponse = await getOpenAIResponse(query);
    return {
      answer: openAIResponse,
      backgroundColor: "#E8D1D1", // Default background color for AI responses
      source: 'openai' // Indicates answer came from OpenAI
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

// Get a response from OpenAI API
async function getOpenAIResponse(query) {
  try {
    // Get API key from environment
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      console.error('OpenAI API key not found');
      return "I apologize, but I'm having trouble accessing my knowledge base right now. Please try asking your question in a different way or try again later.";
    }
    
    const response = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are Abhi, a 43-year-old mental health expert and founder of Meditate with Abhi and The School of Breath. You blend ancient yogic wisdom with modern neuroscience. Keep responses concise, warm, and focused on meditation, breathwork, and wellness."
        },
        {
          role: "user",
          content: query
        }
      ],
      max_tokens: 150
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

module.exports = {
  handleUserQuestion,
  getOpenAIResponse
};