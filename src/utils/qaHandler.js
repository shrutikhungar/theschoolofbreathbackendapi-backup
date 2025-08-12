// utils/qaHandler.js - Updated with MongoDB integration and Gemini API with tools
const FAQ = require('../models/faq.model');
const Course = require('../models/courses.model');
const { GOOGLE_API_KEY } = require('../configs/vars');
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
    // Use Gemini with tools for all questions - no pre-matching needed
    console.log('🤖 Using Gemini with tools for intelligent database search');
    const geminiResponse = await getGeminiResponseWithTools(query, selectedGuide);
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

// Function to get answer from Gemini with tools for dynamic database search
async function getGeminiResponseWithTools(query, selectedGuide = 'abhi') {
  try {
    // Get guide-specific system prompt
    const systemPrompt = await guideService.getGuideSystemPrompt(selectedGuide);
    
    // Generate Gemini response with tools
    const response = await generateGeminiResponseWithTools(
      query, 
      systemPrompt,
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

// Function to generate Gemini response with tools
async function generateGeminiResponseWithTools(query, systemPrompt, selectedGuide = 'abhi') {
  try {
    // Get API key from environment
    const apiKey = GOOGLE_API_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      console.error('Google Gemini API key not found');
      throw new Error('Google Gemini API key not found');
    }
    
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: `${systemPrompt}

CRITICAL INSTRUCTIONS - YOU MUST FOLLOW THESE:
- You have access to a database with FAQs and course information
- ALWAYS search the database before answering questions
- Use search_faqs tool to find relevant information
- Use search_courses tool to find course information
- NEVER make assumptions about what information exists
- If you don't search, you cannot provide accurate answers

IMPORTANT INSTRUCTIONS:
- You have access to database search tools to find relevant information
- Use the search tools to find specific FAQs and courses when needed
- Interpret the user's question intelligently - understand what they're really asking for
- When the user asks about pricing, costs, membership, or subscription, search for relevant information
- Look for ANY mention of prices, costs, fees, or payment information (₹, $, INR, USD)
- Be thorough - search the database for relevant information before answering
- For course questions, search for relevant courses
- Be helpful and creative in finding connections between the question and available information
- Keep responses concise but informative
- Use the guide's personality and tone consistently
- Trust your AI intelligence to interpret questions and find relevant information

RESPONSE FORMAT REQUIREMENTS:
- Respond in PLAIN TEXT ONLY - no markdown symbols, no formatting
- NO bold text (**text**), NO italics (*text*), NO code blocks
- NO emojis, NO special characters, NO bullet points
- NO line breaks or paragraph separators
- Write in one continuous flowing paragraph
- Keep responses short and to the point
- Use simple, clear language without any decorative elements

USER QUESTION: ${query}

IMPORTANT: You MUST search the database using search_faqs or search_courses tools before answering. Do not respond without searching first.`
              }
            ]
          }
        ],
        tools: [
          {
            functionDeclarations: [
              {
                name: "search_faqs",
                description: "Search for relevant FAQs in the knowledge base",
                parameters: {
                  type: "OBJECT",
                  properties: {
                    query: {
                      type: "STRING",
                      description: "Search query for FAQs"
                    },
                    category: {
                      type: "STRING",
                      description: "Optional category filter (general, courses, meditation, breathwork, etc.)"
                    }
                  },
                  required: ["query"]
                }
              },
              {
                name: "search_courses",
                description: "Search for relevant courses",
                parameters: {
                  type: "OBJECT",
                  properties: {
                    query: {
                      type: "STRING",
                      description: "Search query for courses"
                    },
                    type: {
                      type: "STRING",
                      description: "Optional course type filter"
                    }
                  },
                  required: ["query"]
                }
              },
              {
                name: "get_course_details",
                description: "Get detailed information about a specific course",
                parameters: {
                  type: "OBJECT",
                  properties: {
                    course_title: {
                      type: "STRING",
                      description: "Title of the course to get details for"
                    }
                  },
                  required: ["course_title"]
                }
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 150,
          topP: 0.8,
          topK: 40
        }
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('Google Gemini API error:', errorData);
      throw new Error('Google Gemini API request failed');
    }

    const data = await response.json();
    
    console.log('🤖 Gemini API Response:', JSON.stringify(data, null, 2));
    
    // Handle tool calls if Gemini wants to search the database
    if (data.candidates && data.candidates[0].content && data.candidates[0].content.parts) {
      const parts = data.candidates[0].content.parts;
      
      console.log('📋 Response parts:', parts);
      
      // Check if Gemini wants to call tools
      for (const part of parts) {
        if (part.functionCall) {
          console.log('🔧 Function call detected:', part.functionCall);
          const toolResult = await executeToolCall(part.functionCall);
          
          // Make another call to Gemini with the tool results
          return await generateGeminiResponseWithToolResults(query, systemPrompt, toolResult);
        }
      }
      
      // If no tool calls were made, force a search and try again
      console.log('⚠️ Gemini did not call tools, forcing database search...');
      
      // Simple fallback: search with the original query
      const forcedSearchResult = await executeToolCall({
        name: 'search_faqs',
        args: { query: query }
      });
      
      console.log('🔍 Forced search result:', forcedSearchResult);
      
      // Check if forced search found results
      if (forcedSearchResult && forcedSearchResult.results && forcedSearchResult.results.length > 0) {
        console.log('✅ Forced search found results, generating response...');
        try {
          // Generate response with forced search results
          const finalResponse = await generateGeminiResponseWithToolResults(query, systemPrompt, forcedSearchResult);
          console.log('🎯 Final response generated successfully');
          return finalResponse;
        } catch (error) {
          console.error('❌ Error generating final response:', error);
          // If final response generation fails, return the raw search results
          return {
            answer: `Based on your question "${query}", I found this information: ${forcedSearchResult.results[0].answer}`,
            backgroundColor: "#E8D1D1",
            source: 'database_search',
            confidence: 'medium'
          };
        }
      } else {
        console.log('❌ Forced search found no results, using fallback...');
        // If no results found, use fallback
        return getFallbackResponse(new Error('No database results found'), selectedGuide);
      }
    }
    
    console.error('Google Gemini API response format error or empty content:', data);
    throw new Error('Invalid Google Gemini API response format');
    
  } catch (error) {
    console.error('Error generating Google Gemini response:', error);
    throw error;
  }
}

// Function to execute tool calls from Gemini
async function executeToolCall(functionCall) {
  const { name, args } = functionCall;
  
  console.log(`🔧 Executing tool: ${name} with args:`, args);
  
  try {
    switch (name) {
      case 'search_faqs':
        console.log(`🔍 Searching FAQs for: "${args.query}"`);
        const faqs = await FAQ.find({
          $or: [
            { question: { $regex: args.query, $options: 'i' } },
            { answer: { $regex: args.query, $options: 'i' } },
            ...(args.category ? [{ category: args.category }] : [])
          ]
        }).limit(5).lean();
        
        console.log(`📚 Found ${faqs.length} FAQ matches:`, faqs.map(f => f.question));
        
        return {
          tool: 'search_faqs',
          query: args.query,
          results: faqs.map(faq => ({
            question: faq.question,
            answer: faq.answer,
            category: faq.category
          }))
        };
        
      case 'search_courses':
        console.log(`🔍 Searching courses for: "${args.query}"`);
        const courses = await Course.find({
          $or: [
            { title: { $regex: args.query, $options: 'i' } },
            { description: { $regex: args.query, $options: 'i' } },
            ...(args.type ? [{ type: args.type }] : [])
          ]
        }).limit(5).lean();
        
        console.log(`📚 Found ${courses.length} course matches:`, courses.map(c => c.title));
        
        return {
          tool: 'search_courses',
          query: args.query,
          results: courses.map(course => ({
            title: course.title,
            description: course.description,
            type: course.type
          }))
        };
        
      case 'get_course_details':
        console.log(`🔍 Getting details for course: "${args.course_title}"`);
        const course = await Course.findOne({
          title: { $regex: args.course_title, $options: 'i' }
        }).lean();
        
        console.log(`📚 Course found:`, course ? course.title : 'None');
        
        return {
          tool: 'get_course_details',
          course_title: args.course_title,
          result: course ? {
            title: course.title,
            description: course.description,
            type: course.type,
            sections: course.sections?.length || 0,
            accessTags: course.accessTags || []
          } : null
        };
        
      default:
        console.log(`❌ Unknown tool: ${name}`);
        return { error: `Unknown tool: ${name}` };
    }
  } catch (error) {
    console.error(`❌ Error executing tool ${name}:`, error);
    return { error: `Failed to execute ${name}: ${error.message}` };
  }
}

// Function to generate final response with tool results
async function generateGeminiResponseWithToolResults(query, systemPrompt, toolResult) {
  try {
    console.log('🔄 Generating response with tool results:', JSON.stringify(toolResult, null, 2));
    
    const apiKey = GOOGLE_API_KEY || process.env.GOOGLE_API_KEY;
    
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: `${systemPrompt}

IMPORTANT INSTRUCTIONS:
- You have received search results from the database
- Use this information to provide a comprehensive answer
- Interpret the user's question intelligently
- Be helpful and creative in finding connections
- Keep responses concise but informative
- Use the guide's personality and tone consistently

RESPONSE FORMAT REQUIREMENTS:
- Respond in PLAIN TEXT ONLY - no markdown symbols, no formatting
- NO bold text (**text**), NO italics (*text*), NO code blocks
- NO emojis, NO special characters, NO bullet points
- NO line breaks or paragraph separators
- Write in one continuous flowing paragraph
- Keep responses short and to the point
- Use simple, clear language without any decorative elements

USER QUESTION: ${query}

DATABASE SEARCH RESULTS:
${JSON.stringify(toolResult, null, 2)}

Now provide a comprehensive answer based on the search results. Respond in clean plain text without any formatting or symbols.`
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 150,
          topP: 0.8,
          topK: 40
        }
      })
    });
    
    console.log('📡 Gemini API response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Gemini API error response:', errorText);
      throw new Error(`Google Gemini API request failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('🤖 Gemini API response data:', JSON.stringify(data, null, 2));
    
    if (data.candidates && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0].text) {
      const result = data.candidates[0].content.parts[0].text.trim();
      console.log('✅ Generated response successfully:', result);
      return result;
    } else {
      console.error('❌ Invalid Gemini API response format:', data);
      throw new Error('Invalid Google Gemini API response format');
    }
    
  } catch (error) {
    console.error('❌ Error generating response with tool results:', error);
    throw error;
  }
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

  const fallbackAnswer = fallbacks[selectedGuide] || fallbacks.abhi;
  
  return {
    answer: fallbackAnswer,
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
  getGeminiResponseWithTools,
  logUnansweredQuestion,
  isResponsePending,
  cleanAIResponse
};