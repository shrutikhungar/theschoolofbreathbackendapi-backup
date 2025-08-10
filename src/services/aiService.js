const { GoogleGenerativeAI } = require('@google/generative-ai');
const { GEMINI_API_KEY } = require('../configs/vars');

class AIService {
  constructor() {
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is required');
    }
    this.gemini = new GoogleGenerativeAI(GEMINI_API_KEY);
    this.geminiModel = this.gemini.getGenerativeModel({ model: "gemini-1.5-flash" });
  }

  async generateResponse(query, systemPrompt, context, selectedGuide = 'abhi') {
    try {
      return await this.generateGeminiResponse(query, systemPrompt, context);
    } catch (error) {
      console.error('Gemini API error:', error);
      throw error;
    }
  }

  async generateGeminiResponse(query, systemPrompt, context) {
    const prompt = `${systemPrompt}

Follow these guidelines:
- Use the provided context to answer the user's question.
- Look for ANY information that might be relevant, even if it's not an exact match.
- If the user asks about pricing, costs, or membership, search through ALL the context for any financial information.
- If the user asks about courses, search through the course list for relevant options.
- Be creative in finding connections - look for partial matches, related topics, or similar information.
- If you find relevant information, use it to provide a comprehensive answer.
- If no exact match is found, try to provide helpful information from what's available.
- Keep responses concise and within 150 words.
- Use the guide's personality and tone consistently.
- Always try to be helpful and find the most relevant information available.

CONTEXT:
${context}

USER QUESTION: ${query}`;

    const result = await this.geminiModel.generateContent(prompt);
    const response = await result.response;
    return response.text();
  }
}

module.exports = new AIService();
