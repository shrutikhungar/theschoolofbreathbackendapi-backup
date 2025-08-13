// utils/qaHandler.js - OpenAI Assistant implementation
const axios = require('axios');
const guideService = require('../services/guideService');

// OpenAI Assistant configuration
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const ASSISTANT_ID = 'asst_DpE9BT8GVThgq0Wp6W4hTtpk';

const OPENAI_HEADERS = {
  'Authorization': `Bearer ${OPENAI_API_KEY}`,
  'Content-Type': 'application/json',
  'OpenAI-Beta': 'assistants=v2'
};

// Delay helper
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Clean response function to remove markdown and formatting
function cleanResponse(answer) {
  return answer
    .replace(/\*\*(.*?)\*\*/g, '$1') // Remove **bold**
    .replace(/\*(.*?)\*/g, '$1')     // Remove *italic*
    .replace(/##\s*/g, '')           // Remove ## headers
    .replace(/#\s*/g, '')            // Remove # headers
    .replace(/-\s*/g, '')            // Remove - lists
    .replace(/\n\s*\n/g, '\n')      // Remove extra line breaks
    .replace(/^\s+|\s+$/g, '')      // Trim whitespace
    .replace(/[🌟🌼🙏😊✨💫]/g, '') // Remove emojis
    .replace(/\s+/g, ' ')           // Normalize spaces
    .trim();
}

// Main handler function for user questions
async function handleUserQuestion(query, selectedGuide = 'abhi') {
  const lowerCaseQuery = query.toLowerCase().trim();

  // Greeting detection (partial match)
  const greetingKeywords = ["hello", "hi", "hey", "good morning", "good afternoon", "good evening"];
  if (greetingKeywords.some(greet => lowerCaseQuery.startsWith(greet))) {
    const greetings = [
      "Hello there! How can I help you today?",
      "Hi! What's on your mind?",
      "Hey! Ask me anything about The School of Breath."
    ];
    return {
      answer: greetings[Math.floor(Math.random() * greetings.length)],
      backgroundColor: "#E8D1D1",
      source: 'greeting'
    };
  }

  try {
    const assistantResponse = await getOpenAIResponse(query, selectedGuide);
    return {
      answer: assistantResponse,
      backgroundColor: "#E8D1D1",
      source: 'openai_assistant'
    };
  } catch (error) {
    console.error('Error handling question:', error.message || error);
    return {
      answer: "I apologize, but I'm having trouble processing your question right now. Please try again later.",
      backgroundColor: "#F2E8E8",
      source: 'error'
    };
  }
}

// Get response from OpenAI Assistant
async function getOpenAIResponse(query, selectedGuide = 'abhi') {
  if (!OPENAI_API_KEY || !ASSISTANT_ID) {
    console.error('OpenAI API key or Assistant ID not found');
    return "I apologize, but I'm having trouble accessing my knowledge base right now. Please try again later.";
  }

  try {
    const guideContext = await guideService.getGuideSystemPrompt(selectedGuide);

    // 1. Create a thread with metadata (required by latest API)
    const threadRes = await axios.post('https://api.openai.com/v1/threads', {
      metadata: {
        source: 'breathwork_app',
        guide: selectedGuide,
        timestamp: new Date().toISOString()
      }
    }, { headers: OPENAI_HEADERS });
    
    if (!threadRes.data?.id) {
      throw new Error('Failed to create thread: No thread ID returned');
    }
    
    const threadId = threadRes.data.id;
    console.log('Thread created:', threadId);

    // 2. Add user message with proper content structure
    const messageRes = await axios.post(
      `https://api.openai.com/v1/threads/${threadId}/messages`,
      {
        role: 'user',
        content: `Context: ${guideContext}\n\nUser Question: ${query}`
      },
      { headers: OPENAI_HEADERS }
    );
    
    if (!messageRes.data?.id) {
      throw new Error('Failed to add message: No message ID returned');
    }
    
    console.log('Message added:', messageRes.data.id);

    // 3. Run the assistant
    const runRes = await axios.post(
      `https://api.openai.com/v1/threads/${threadId}/runs`,
      { 
        assistant_id: ASSISTANT_ID,
        instructions: `INSTRUCTIONS:
- Use the relevant sources to provide accurate answers
- Keep responses SHORT and CONCISE (max 2-3 sentences)
- NO markdown formatting (no **, ##, -, /, etc.)
- NO emojis or special characters
- Be direct and helpful
- If sources don't fully answer the question, say so briefly
- Reference specific courses when relevant`
      },
      { headers: OPENAI_HEADERS }
    );
    
    if (!runRes.data?.id) {
      throw new Error('Failed to create run: No run ID returned');
    }
    
    const runId = runRes.data.id;
    console.log('Run created:', runId);

    // 4. Poll until completion with timeout
    let runStatus = 'queued';
    let attempts = 0;
    const maxAttempts = 60; // 60 seconds timeout
    
    while (['queued', 'in_progress'].includes(runStatus) && attempts < maxAttempts) {
      await sleep(1000);
      attempts++;
      
      try {
        const statusRes = await axios.get(
          `https://api.openai.com/v1/threads/${threadId}/runs/${runId}`,
          { headers: OPENAI_HEADERS }
        );
        
        runStatus = statusRes.data.status;
        console.log(`Run status (attempt ${attempts}):`, runStatus);
        
        if (runStatus === 'failed') {
          const errorDetails = statusRes.data.last_error;
          throw new Error(`Assistant run failed: ${errorDetails?.message || 'Unknown error'}`);
        }
        
        if (runStatus === 'expired') {
          throw new Error('Assistant run expired');
        }
        
        if (runStatus === 'cancelled') {
          throw new Error('Assistant run was cancelled');
        }
        
        // Add small delay to avoid rate limiting
        if (runStatus === 'in_progress') {
          await sleep(500);
        }
        
        // If completed, add small delay to ensure message is fully processed
        if (runStatus === 'completed') {
          await sleep(500);
          break;
        }
        
      } catch (error) {
        if (error.response?.status === 429) {
          // Rate limited - wait longer
          console.log('Rate limited, waiting 2 seconds...');
          await sleep(2000);
          continue;
        }
        throw error;
      }
    }
    
    if (attempts >= maxAttempts) {
      throw new Error('Assistant run timed out');
    }

    // 5. Get messages with proper error handling
    const messagesRes = await axios.get(
      `https://api.openai.com/v1/threads/${threadId}/messages`,
      { headers: OPENAI_HEADERS }
    );

    if (!messagesRes.data?.data || !Array.isArray(messagesRes.data.data)) {
      throw new Error('Invalid messages response structure');
    }

    const assistantMessage = messagesRes.data.data.find(msg => msg.role === 'assistant');
    
    if (!assistantMessage) {
      throw new Error('No assistant message found in response');
    }

    const content = assistantMessage.content?.[0]?.text?.value;
    
    if (!content) {
      throw new Error('Assistant message has no text content');
    }

    console.log('Assistant response received successfully');
    return cleanResponse(content);

  } catch (error) {
    console.error('Error getting OpenAI Assistant response:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status
    });
    
    // Provide more specific error messages
    if (error.response?.status === 400) {
      return "I apologize, but there was an issue with the request format. Please try rephrasing your question.";
    } else if (error.response?.status === 401) {
      return "I apologize, but there's an authentication issue. Please contact support.";
    } else if (error.response?.status === 429) {
      return "I apologize, but the service is currently busy. Please try again in a moment.";
    } else if (error.response?.status >= 500) {
      return "I apologize, but the service is experiencing technical difficulties. Please try again later.";
    }
    
    return "I apologize, but I'm having trouble connecting to my knowledge base right now. Please try again later.";
  }
}

// Log unanswered questions
async function logUnansweredQuestion(question, userId = null) {
  try {
    console.log(`Unanswered question logged: "${question}" from user ${userId || 'anonymous'}`);
  } catch (error) {
    console.error('Error logging unanswered question:', error.message || error);
  }
}

module.exports = {
  handleUserQuestion,
  getOpenAIResponse,
  logUnansweredQuestion
};