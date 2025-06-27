const { randomUUID } = require('crypto');
const { streamText,generateText } = require('ai');
const { openai } = require('@ai-sdk/openai');
const MessageModel = require('../models/chat.model'); // adjust your import
; // adjust your import
const { recommendCourseTool } = require('./tools');

module.exports.handleChat = async ({ userId, prompt, sessionId }) => {
  const newSessionId = sessionId || randomUUID();

  const history = await MessageModel.find({ userId, sessionId: newSessionId }).sort({ createdAt: 1 }).lean();

  const messages = [
    { role: 'system', content: 'You are Abhi, a 43-year-old mental health expert and founder of Meditate with Abhi and The School of Breath. You blend ancient yogic wisdom with modern neuroscience. Keep responses concise, warm, and focused on meditation, breathwork, and wellness.' },
    ...history.map((msg) => ({ role: msg.role, content: msg.content })),
    { role: 'user', content: prompt },
  ];

  const result = await generateText({
    model: openai('gpt-4o'),
    messages,
    tools: [recommendCourseTool], // ✅ Pass your tools here
  });

  let fullResponse = '';
 /*  for await (const part of result.textStream) {
    if (part.type === 'text') {
      fullResponse += part.content;
    }
  } */
  console.log('result' );
  console.log(result);
  console.log('fullResponse');
  console.log( fullResponse);


  return { response: 'cc', sessionId: newSessionId };
};
