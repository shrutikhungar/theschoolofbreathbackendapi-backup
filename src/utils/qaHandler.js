// utils/qaHandler.js - Clean RAG Implementation
const FAQ = require('../models/faq.model');
const { GROQ_API_KEY, OPENAI_API_KEY: OPENAI_API_KEY_VAR } = require('../configs/vars');
const Course = require('../models/courses.model');
const guideService = require('../services/guideService');


// Load environment variables for OpenAI API key

const OPENAI_API_KEY = OPENAI_API_KEY_VAR ?? process.env.OPENAI_API_KEY;

// RAG: Generate embeddings using OpenAI (ONLY for setup, not during chat)
async function generateEmbedding(text) {
  try {
    if (!OPENAI_API_KEY) {
      throw new Error('OpenAI API key not found');
    }

    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        input: text,
        model: "text-embedding-3-small" // Fast and cost-effective
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    return data.data[0].embedding;
  } catch (error) {
    console.error('Error generating embedding:', error);
    return null;
  }
}

// RAG: Fast vector search using PRE-GENERATED embeddings (no API calls during chat!)
async function vectorSearch(query, limit = 8) {
  try {
    console.log('🔍 Starting vector search for query:', query);
    
    // Generate embedding for USER'S question only (this is the only API call during chat)
    const queryEmbedding = await generateEmbedding(query);
    if (!queryEmbedding) {
      throw new Error('Failed to generate query embedding');
    }
    
    console.log('✅ Query embedding generated successfully');

    // Use MongoDB Atlas Vector Search with PRE-GENERATED FAQ embeddings
    console.log('🗄️ Attempting MongoDB Atlas Vector Search...');
    const results = await FAQ.aggregate([
      {
        $vectorSearch: {
          queryVector: queryEmbedding,        // ← User question (new)
          path: "embedding",                  // ← FAQ content (pre-generated!)
          numCandidates: 200,                 // ← Increased from 100
          limit: limit,
          index: "faq_vector"
        }
      },
      {
        $project: {
          question: 1,
          answer: 1,
          category: 1,
          backgroundColor: 1,
          score: { $meta: "vectorSearchScore" }
        }
      }
    ]);

    // Filter results with more lenient threshold
    const filteredResults = results.filter(result => result.score > 0.1); // Reduced from default 0.7
    
    console.log(`✅ Vector search successful! Found ${results.length} raw results, ${filteredResults.length} after filtering`);
    return filteredResults;
  } catch (error) {
    console.error('❌ Vector search error:', error.message);
    console.log('🔄 Falling back to text search...');
    // Fallback to text search
    return await fallbackTextSearch(query, limit);
  }
}

// Fallback text search when vector search fails
async function fallbackTextSearch(query, limit = 8) {
  try {
    console.log('🔍 Using fallback text search...');
    
    // Split query into keywords for better matching
    const keywords = query.toLowerCase().split(/\s+/).filter(word => word.length > 2);
    console.log('🔑 Search keywords:', keywords);
    
    // More flexible text search
    const results = await FAQ.find({
      $or: [
        // Exact phrase match
        { question: { $regex: query, $options: 'i' } },
        { answer: { $regex: query, $options: 'i' } },
        // Keyword matches
        { question: { $regex: keywords.join('|'), $options: 'i' } },
        { answer: { $regex: keywords.join('|'), $options: 'i' } }
      ]
    }).limit(limit).lean();

    console.log(`📊 Fallback search found ${results.length} results`);
    
    // Score results based on relevance
    const scoredResults = results.map(item => {
      let score = 0.5; // Base score
      
      // Boost score for exact matches
      if (item.question.toLowerCase().includes(query.toLowerCase())) score += 0.3;
      if (item.answer.toLowerCase().includes(query.toLowerCase())) score += 0.2;
      
      // Boost score for keyword matches
      const questionWords = item.question.toLowerCase().split(/\s+/);
      const answerWords = item.answer.toLowerCase().split(/\s+/);
      const commonKeywords = keywords.filter(keyword => 
        questionWords.includes(keyword) || answerWords.includes(keyword)
      );
      score += (commonKeywords.length / keywords.length) * 0.2;
      
      return { ...item, score: Math.min(1.0, score) };
    });
    
    // Sort by score
    scoredResults.sort((a, b) => b.score - a.score);
    
    return scoredResults;
  } catch (error) {
    console.error('Fallback search error:', error);
    return [];
  }
}

// RAG: Main handler with PRE-GENERATED embeddings (super fast!)
async function handleUserQuestion(query, selectedGuide = 'abhi') {
  try {
    // 1. Fast vector search using pre-generated embeddings
    const relevantContent = await vectorSearch(query);
    
    // 2. Generate intelligent response using RAG
    if (relevantContent.length > 0) {
      const response = await generateRAGResponse(query, relevantContent, selectedGuide);
      
      // Update usage metrics
      if (relevantContent[0]._id) {
        await FAQ.findByIdAndUpdate(relevantContent[0]._id, {
          $inc: { views: 1 },
          $set: { lastAccessed: new Date() }
        });
      }
      
      return {
        answer: response,
        backgroundColor: relevantContent[0].backgroundColor || "#E8D1D1",
        source: 'rag_vector_search',
        confidence: relevantContent[0].score || 0.8,
        relevantSources: relevantContent.length
      };
    }
    
    // 3. Generate response from scratch if no relevant content
    const fallbackResponse = await generateFallbackResponse(query, selectedGuide);
    
    return {
      answer: fallbackResponse,
      backgroundColor: "#E8D1D1",
      source: 'ai_generated',
      confidence: 0.2
    };
    
  } catch (error) {
    console.error('Error in RAG handler:', error);
    return await generateErrorResponse(query, error);
  }
}

// RAG: Generate response using retrieved content
async function generateRAGResponse(query, relevantContent, selectedGuide) {
  try {
    const apiKey = GROQ_API_KEY;
    if (!apiKey) {
      throw new Error('Groq API key not found');
    }
    
    // Get guide personality
    const systemPrompt = await guideService.getGuideSystemPrompt(selectedGuide);
    
    // Build context from relevant content
    const contextText = relevantContent.map((item, index) => 
      `Source ${index + 1} (Relevance: ${(item.score * 100).toFixed(1)}%):\nQ: ${item.question}\nA: ${item.answer}`
    ).join('\n\n');
    
    // Get available courses for context
    const courses = await Course.find().limit(14).lean();
    const courseContext = courses.map(course => 
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
            content: `${systemPrompt}

You are a RAG-enhanced AI assistant. Answer the user's question using the provided relevant sources.

RELEVANT SOURCES (ranked by relevance):
${contextText}

AVAILABLE COURSES:
${courseContext}

INSTRUCTIONS:
- Use the relevant sources to provide accurate answers
- Keep responses SHORT and CONCISE (max 2-3 sentences)
- NO markdown formatting (no **, ##, -, /,etc.)
- NO emojis or special characters
- Be direct and helpful
- If sources don't fully answer the question, say so briefly
- Reference specific courses when relevant`
          },
          {
            role: "user",
            content: query
          }
        ],
        max_tokens: 150, // Reduced from 300 for shorter responses
        temperature: 0.1
      })
    });
    
    if (!response.ok) {
      throw new Error(`Groq API error: ${response.status}`);
    }
    
    const data = await response.json();
    let answer = data.choices[0].message.content.trim();
    console.log('🔍 RAG response:', answer);
    // Clean up any remaining markdown or formatting
    answer = answer
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
    
    return answer;
    
  } catch (error) {
    console.error('Error generating RAG response:', error);
    // Fallback to best relevant content
    return relevantContent[0]?.answer || "I'm having trouble processing your question right now.";
  }
}

// Generate fallback response when no relevant content exists
async function generateFallbackResponse(query, selectedGuide) {
  try {
    const apiKey = GROQ_API_KEY;
    if (!apiKey) {
      return "I don't have specific information about that yet, but I'd be happy to help you with general questions about breathwork and meditation.";
    }
    
    const systemPrompt = await guideService.getGuideSystemPrompt(selectedGuide);
    
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
            content: `${systemPrompt}

The user asked a question that isn't in our knowledge base yet. Provide a helpful, general response about breathwork, meditation, or wellness that might be related to their question. Be honest about not having specific information but offer general guidance.

INSTRUCTIONS:
- Keep response SHORT (1-2 sentences max)
- NO markdown formatting
- NO emojis or special characters
- Be direct and helpful`
          },
          {
            role: "user",
            content: query
          }
        ],
        max_tokens: 100, // Reduced from 200 for shorter responses
        temperature: 0.3
      })
    });
    
    if (!response.ok) {
      throw new Error(`Groq API error: ${response.status}`);
    }
    
    const data = await response.json();
    let answer = data.choices[0].message.content.trim();
    
    // Clean up any remaining markdown or formatting
    answer = answer
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
    
    return answer;
    
  } catch (error) {
    console.error('Error generating fallback response:', error);
    return "I don't have specific information about that yet, but I'm here to help with general questions about breathwork and wellness.";
  }
}

// Generate contextual error response
async function generateErrorResponse(query, error) {
  const errorMessages = [
    `I'm having trouble with "${query}" right now. Please try again in a moment.`,
    `I couldn't process "${query}" at the moment. Try asking in a different way.`,
    `There was an issue with "${query}". Please try again later.`
  ];
  
  return {
    answer: errorMessages[Math.floor(Math.random() * errorMessages.length)],
    backgroundColor: "#F2E8E8",
    source: 'error',
    errorType: error.name
  };
}

module.exports = {
  // Core RAG functions
  handleUserQuestion,
  vectorSearch,
  generateRAGResponse,
  generateFallbackResponse,
  generateErrorResponse,
  
  // Utility functions
  generateEmbedding,
  fallbackTextSearch
};