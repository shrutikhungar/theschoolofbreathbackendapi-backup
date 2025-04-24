const { openai } = require('@ai-sdk/openai');
const { streamText } = require('ai');
const ChatHistory = require('../models/chat.model');
const { randomUUID } = require('crypto');
const MessageModel = require('../models/chat.model');

module.exports.handleChat = async ({ userId, prompt,sessionId }) => {
   // If no sessionId provided, generate one
   const newSessionId = sessionId || randomUUID();

   // Fetch chat history for this session
   const history = await MessageModel.find({ userId, sessionId: newSessionId }).sort({ createdAt: 1 }).lean();
 
   const messages = [
     ...history.map((msg) => ({ role: msg.role, content: msg.content })),
     { role: 'user', content: prompt },
   ];
 
   // AI response
   const result = await streamText({
     model: openai('gpt-4o'),
     prompt: 'You are Abhi, a 43-year-old mental health expert and founder of Meditate with Abhi and The School of Breath. You blend ancient yogic wisdom with modern neuroscience. Keep responses concise, warm, and focused on meditation, breathwork, and wellness.',
     messages,
     tools: {
        getCourses: tool({
            description: 'courses recommendations',
           
            execute: async ({ location }) => ({
             courses: ['course1', 'course2', 'course3']
            }),
          }),
     }, // Add custom tools if needed
   });
 
   let fullResponse = '';
   for await (const part of result.textStream) {
     fullResponse += part;
   }
 
   // Save both messages
   await MessageModel.create([
     { userId, sessionId: newSessionId, role: 'user', content: prompt },
     { userId, sessionId: newSessionId, role: 'assistant', content: fullResponse },
   ]);
 
   return { response: fullResponse, sessionId: newSessionId };
}
