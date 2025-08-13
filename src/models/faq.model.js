// models/faq.model.js
const mongoose = require('mongoose');

const faqSchema = new mongoose.Schema({
  category: {
    type: String,
    required: true,
    enum: ['general', 'membership', 'course', 'app', 'technical']
  },
  question: {
    type: String,
    required: true,
    index: true // Add text index for better search
  },
  answer: {
    type: String,
    required: true
  },
  // RAG support fields
  embedding: [Number], // OpenAI embedding vector (1536 dimensions)
  views: { type: Number, default: 0 }, // Track usage
  lastAccessed: Date, // Track last access
  backgroundColor: {
    type: String,
    default: '#FFFFFF'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Add text index for better search
faqSchema.index({ question: 'text', answer: 'text' });

// Update the updatedAt field before saving
faqSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Auto-generate embeddings when FAQ is created or updated
faqSchema.pre('save', async function(next) {
  try {
    // Only generate embedding if question or answer changed
    if (this.isModified('question') || this.isModified('answer')) {
      const { generateEmbedding } = require('../utils/qaHandler');
      const text = `${this.question} ${this.answer}`;
      this.embedding = await generateEmbedding(text);
      console.log(`✅ Auto-generated embedding for: ${this.question.substring(0, 50)}...`);
    }
    next();
  } catch (error) {
    console.error('❌ Error auto-generating embedding:', error);
    next(error);
  }
});

const FAQ = mongoose.model('FAQ', faqSchema);

module.exports = FAQ;