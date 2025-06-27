// utils/qaHandler.js - Updated with MongoDB integration and Groq API
const Fuse = require('fuse.js');
const axios = require('axios');
const FAQ = require('../models/faq.model');
const { GROQ_API_KEY } = require('../configs/vars');
const Course = require('../models/courses.model');
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
async function handleUserQuestion(query) {
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
    
    // If no local match found, use Groq
    const groqResponse = await getGroqResponse(query);
    return {
      answer: groqResponse,
      backgroundColor: "#E8D1D1", // Default background color for AI responses
      source: 'groq', // Indicates answer came from Groq
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

// Function to get answer from Groq (replacing OpenAI)
async function getGroqResponse(query) {
  try {
    // Get API key from environment
    const apiKey = GROQ_API_KEY;
    
    if (!apiKey) {
      console.error('Groq API key not found');
      return "I apologize, but I'm having trouble accessing my knowledge base right now. Please try asking your question in a different way or try again later.";
    }
    
    // Get relevant FAQs to provide as context to Groq
    const contextFAQs = await FAQ.find({
      $or: [
        { question: { $regex: query, $options: 'i' } },
        { answer: { $regex: query, $options: 'i' } }
      ]
    }).limit(10).lean();

    // get courses showing just title and description
    const courses = await Course.find().limit(10).lean(); 
    
    const context = contextFAQs.map(faq => 
      `Q: ${faq.question}\nA: ${faq.answer}`
    ).join('\n\n');
    const contextCourses = courses.map(course => 
      `- ${course.title}: ${course.description}`
    ).join('\n');
   
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "llama3-70b-8192",
        messages: [
          {
            role: 'system',
            content: `
          You are Abhi, a 43-year-old mental health expert and founder of Meditate with Abhi and The School of Breath.
          You blend ancient yogic wisdom with modern neuroscience.
          
          Follow these strict rules:
          - ONLY use the provided context to answer the user.
          - DO NOT invent any information not present in the context.
          - If the user asks about courses, use ONLY the course list provided.
          - If no relevant course is found, say: "I'm sorry, I couldn't find any course matching your request."
        

          Here is the GENERAL CONTEXT:
          ${context}
               Here is the LIST OF COURSES:
          ${contextCourses}
       
          `
          },
          {
            role: "user",
            content: query
          }
        ],
        max_tokens: 150,
        temperature: 0.1
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('Groq API error:', errorData);
      return "I apologize, but I'm having trouble processing your question right now. Please try again later.";
    }

    const data = await response.json();
    if (data.choices && data.choices.length > 0 && data.choices[0].message && data.choices[0].message.content) {
      return data.choices[0].message.content.trim();
    } else {
      console.error('Groq API response format error or empty content:', data);
      return "I apologize, but I received an unexpected response. Please try again.";
    }
  } catch (error) {
    console.error('Error getting Groq response:', error);
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

// Function to check if the response is pending
function isResponsePending(response) {
  return response === null;
}

module.exports = {
  handleUserQuestion,
  getGroqResponse,
  logUnansweredQuestion,
  isResponsePending,
  searchKnowledgeBase
};