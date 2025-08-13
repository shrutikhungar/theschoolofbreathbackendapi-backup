# 🚀 RAG Setup Guide with External Tools

## **What We've Implemented**

Your FAQ system now uses **Retrieval-Augmented Generation (RAG)** with industry-standard tools:

- **OpenAI Embeddings** → Semantic understanding
- **MongoDB Atlas Vector Search** → Fast similarity search  
- **Groq API** → Intelligent response generation
- **No hardcoded responses** → Everything is dynamic

## **🔑 Required API Keys**

Add these to your `src/configs/vars.js`:

```javascript
module.exports = {
  // ... existing config
  GROQ_API_KEY: process.env.GROQ_API_KEY,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY, // NEW!
  // ... rest of config
};
```

## **📋 Setup Steps**

### **1. Get OpenAI API Key**
- Go to [OpenAI Platform](https://platform.openai.com/api-keys)
- Create new API key
- Add to your `.env` file: `OPENAI_API_KEY=your_key_here`

### **2. Enable MongoDB Atlas Vector Search**
- Go to your MongoDB Atlas dashboard
- Navigate to **Search** → **Create Search Index**
- Choose **JSON Editor** and paste this:

```json
{
  "mappings": {
    "dynamic": true,
    "fields": {
      "embedding": {
        "dimensions": 1536,
        "similarity": "cosine",
        "type": "knnVector"
      }
    }
  }
}
```

- Name it: `faq_vector_index`
- Click **Create**

### **3. Run Setup Script**
```bash
node src/utils/setupRAG.js
```

This will:
- ✅ Initialize metrics for existing FAQs
- ✅ Generate OpenAI embeddings for all FAQ content
- ✅ Set up the vector search infrastructure

## **🎯 How It Works Now**

### **Before (Hardcoded)**
```
User: "How do I meditate?"
System: "Hello there! How can I help you today?" ❌
```

### **After (RAG)**
```
User: "How do I meditate?"
System: 
1. 🔍 Generates embedding for "How do I meditate?"
2. 🗄️ Searches MongoDB Atlas for similar FAQ vectors
3. 📚 Retrieves most relevant content
4. 🤖 Generates intelligent response using Groq + context
5. 💡 Returns: "Based on our meditation guide, start with..." ✅
```

## **🚀 Benefits**

- **No more hardcoded responses** - Everything is dynamic
- **Semantic understanding** - Understands meaning, not just keywords
- **Fast vector search** - MongoDB Atlas handles similarity search
- **Intelligent responses** - Combines your knowledge base with AI generation
- **Scalable** - Works with thousands of FAQs

## **🔧 Testing Your RAG System**

1. **Start your server**
2. **Ask a question** through your FAQ endpoint
3. **Check the response source** - should show `rag_vector_search`
4. **Monitor confidence scores** - higher = more relevant

## **📊 Monitoring**

Your system now tracks:
- **Views** - How often each FAQ is accessed
- **Last accessed** - When each FAQ was last used
- **Confidence scores** - How relevant each response is
- **Source types** - Where responses come from

## **🔄 Continuous Improvement**

- **Add new FAQs** - They automatically get embeddings
- **Monitor usage** - See which questions are most popular
- **Adjust thresholds** - Fine-tune relevance scoring
- **Scale up** - Add more content without rebuilding

## **❓ Troubleshooting**

### **"OpenAI API key not found"**
- Check your `.env` file
- Verify `OPENAI_API_KEY` is set
- Restart your server

### **"Vector search index not found"**
- Create the index in MongoDB Atlas
- Wait for index to finish building
- Check index name matches `faq_vector_index`

### **"Embedding generation failed"**
- Check OpenAI API quota
- Verify API key permissions
- Check network connectivity

## **🎉 You're Done!**

Your FAQ system is now powered by cutting-edge RAG technology using the best external tools available. No more hardcoded responses - just intelligent, context-aware answers that get better over time!

---

**Need help?** Check the console logs for detailed error messages and debugging information.
