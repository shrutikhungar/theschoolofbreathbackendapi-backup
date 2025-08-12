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
      return await this.generateGeminiResponseSimple(query, systemPrompt, context);
    } catch (error) {
      console.error('Gemini API error:', error);
      throw error;
    }
  }

  async generateGeminiResponseSimple(query, systemPrompt, context) {
    const prompt = `${systemPrompt}

IMPORTANT INSTRUCTIONS:
- You have access to a comprehensive knowledge base with FAQs and course information
- Interpret the user's question intelligently - understand what they're really asking for
- When the user asks about pricing, costs, membership, or subscription, search through ALL the context thoroughly
- Look for ANY mention of prices, costs, fees, or payment information (₹, $, INR, USD)
- Be thorough - check both questions and answers for relevant information
- If you find pricing information, present it clearly and completely
- Don't say "I don't have information" until you've thoroughly searched the context
- For course questions, look through the course list for relevant options
- Be helpful and creative in finding connections between the question and available information
- Keep responses concise but informative
- Use the guide's personality and tone consistently
- Trust your AI intelligence to understand context and find relevant information

RESPONSE FORMAT REQUIREMENTS:
- Respond in PLAIN TEXT ONLY - no markdown symbols, no formatting
- NO bold text (**text**), NO italics (*text*), NO code blocks
- NO emojis, NO special characters, NO bullet points
- NO line breaks or paragraph separators
- Write in one continuous flowing paragraph
- Keep responses short and to the point
- Use simple, clear language without any decorative elements

CONTEXT (search this thoroughly):
${context}

USER QUESTION: ${query}

Remember: Use your AI intelligence to interpret the question and search the context thoroughly! Respond in clean plain text without any formatting or symbols.`;

    const result = await this.geminiModel.generateContent(prompt);
    const response = await result.response;
    return response.text();
  }
}

module.exports = new AIService();
