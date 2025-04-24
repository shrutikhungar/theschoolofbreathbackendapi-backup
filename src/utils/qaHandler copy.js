// utils/qaHandler.js - Updated with source tracking
const Fuse = require('fuse.js');
const { openai } = require('@ai-sdk/openai');
const { streamText, tool } = require('ai');
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

// Get a response from OpenAI using the ai-sdk/openai package
async function getOpenAIResponse(query) {
  try {
    console.log(query)
    // Use the streamText function from the ai package
    const result = await streamText({
      model: openai('gpt-3.5-turbo'),
     
      messages: [
        { role: 'user', content: query }
      ],
      tools: {
        getCourses: tool({
            description: 'courses recommendations',
           
            execute: async ({ location }) => ({
             courses: ['course1', 'course2', 'course3']
            }),
          }),
     }, // Add custom tools if needed // Add custom tools if needed
    });
    
    // Collect the full response
    let fullResponse = '';
    for await (const part of result.textStream) {
      fullResponse += part;
    }
    console.log(result)
    return fullResponse.trim();
  } catch (error) {
    console.error('Error getting OpenAI response:', error);
    return "I apologize, but I'm having trouble connecting to my knowledge base right now. Please try asking your question in a different way or try again later.";
  }
}

module.exports = {
  handleUserQuestion,
  getOpenAIResponse
};