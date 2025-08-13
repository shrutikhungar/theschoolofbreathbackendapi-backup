// utils/generateAllEmbeddings.js - Generate ALL FAQ embeddings at once
const mongoose = require('mongoose');
const FAQ = require('../models/faq.model');


const OPENAI_API_KEY = process.env.OPENAI_API_KEY ?? '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';

// Database connection
async function connectToDatabase() {
  try {
    const mongoUri = 'mongodb+srv://angelarrieta34:parzival-13@cluster0.v1s4k1u.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
    if (!mongoUri) {
      throw new Error('MongoDB connection string not found in environment variables');
    }
    
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('✅ Connected to MongoDB successfully!');
    return true;
  } catch (error) {
    console.error('❌ Failed to connect to MongoDB:', error.message);
    return false;
  }
}

// Check if OpenAI API key is available
function checkOpenAIKey() {
  if (!OPENAI_API_KEY) {
    console.log('❌ OPENAI_API_KEY not found in environment variables');
    console.log('📝 Please add OPENAI_API_KEY to your .env file or configs/vars.js');
    console.log('🔑 Get your key from: https://platform.openai.com/api-keys');
    return false;
  }
  console.log('✅ OPENAI_API_KEY found');
  return true;
}

// Generate embedding for a single text
async function generateEmbedding(text) {
  try {
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

// Generate embeddings for ALL FAQs at once
async function generateAllFAQEmbeddings() {
  try {
    console.log('🚀 Starting bulk embedding generation for ALL FAQs...\n');
    
    // Get all FAQs that don't have embeddings
    const faqsWithoutEmbeddings = await FAQ.find({
      $or: [
        { embedding: { $exists: false } },
        { embedding: { $size: 0 } }
      ]
    });
    
    if (faqsWithoutEmbeddings.length === 0) {
      console.log('✅ All FAQs already have embeddings!');
      return;
    }
    
    console.log(`📊 Found ${faqsWithoutEmbeddings.length} FAQs without embeddings`);
    console.log('💰 Estimated cost: $' + (faqsWithoutEmbeddings.length * 0.0001).toFixed(4));
    console.log('⏱️  Estimated time: ' + Math.ceil(faqsWithoutEmbeddings.length / 10) + ' minutes\n');
    
    let successCount = 0;
    let errorCount = 0;
    
    // Process in batches to avoid overwhelming the API
    const batchSize = 10;
    for (let i = 0; i < faqsWithoutEmbeddings.length; i += batchSize) {
      const batch = faqsWithoutEmbeddings.slice(i, i + batchSize);
      
      console.log(`📦 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(faqsWithoutEmbeddings.length / batchSize)}`);
      
      // Process batch in parallel
      const batchPromises = batch.map(async (faq, index) => {
        try {
          const text = `${faq.question} ${faq.answer}`;
          const embedding = await generateEmbedding(text);
          
          if (embedding) {
            await FAQ.findByIdAndUpdate(faq._id, {
              $set: { embedding }
            });
            successCount++;
            console.log(`  ✅ ${i + index + 1}/${faqsWithoutEmbeddings.length}: ${faq.question.substring(0, 50)}...`);
          } else {
            errorCount++;
            console.log(`  ❌ ${i + index + 1}/${faqsWithoutEmbeddings.length}: Failed to generate embedding`);
          }
        } catch (error) {
          errorCount++;
          console.log(`  ❌ ${i + index + 1}/${faqsWithoutEmbeddings.length}: ${error.message}`);
        }
      });
      
      // Wait for batch to complete
      await Promise.all(batchPromises);
      
      // Rate limiting between batches (1 second)
      if (i + batchSize < faqsWithoutEmbeddings.length) {
        console.log('⏳ Waiting 1 second before next batch...\n');
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    console.log('\n🎉 Bulk embedding generation completed!');
    console.log(`✅ Success: ${successCount} FAQs`);
    console.log(`❌ Errors: ${errorCount} FAQs`);
    console.log(`📊 Total processed: ${successCount + errorCount} FAQs`);
    
    if (successCount > 0) {
      console.log('\n🚀 Your FAQ system is now ready for RAG!');
      console.log('💡 Start your chat system - all embeddings are pre-generated!');
    }
    
  } catch (error) {
    console.error('❌ Fatal error during bulk embedding generation:', error);
  }
}

// Verify all FAQs have embeddings
async function verifyEmbeddings() {
  try {
    console.log('🔍 Verifying all FAQ embeddings...');
    
    const totalFAQs = await FAQ.countDocuments();
    const faqsWithEmbeddings = await FAQ.countDocuments({ 
      embedding: { $exists: true, $ne: [] } 
    });
    
    console.log(`📊 Total FAQs: ${totalFAQs}`);
    console.log(`✅ FAQs with embeddings: ${faqsWithEmbeddings}`);
    console.log(`❌ FAQs without embeddings: ${totalFAQs - faqsWithEmbeddings}`);
    
    if (faqsWithEmbeddings === totalFAQs) {
      console.log('🎉 All FAQs are ready for RAG!');
    } else {
      console.log('⚠️  Some FAQs still need embeddings. Run generateAllFAQEmbeddings() again.');
    }
    
    return faqsWithEmbeddings === totalFAQs;
  } catch (error) {
    console.error('Error verifying embeddings:', error);
    return false;
  }
}

// Main execution
async function main() {
  try {
    console.log('🧠 FAQ Embedding Generator\n');
    
    // Step 1: Check API key
    if (!checkOpenAIKey()) {
      process.exit(1);
    }
    
    // Step 2: Connect to database
    const dbConnected = await connectToDatabase();
    if (!dbConnected) {
      console.log('❌ Cannot continue without database connection');
      process.exit(1);
    }
    
    // Step 3: Generate all embeddings
    await generateAllFAQEmbeddings();
    
    // Step 4: Verify completion
    console.log('\n' + '='.repeat(50));
    await verifyEmbeddings();
    
    // Step 5: Close database connection
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
    
  } catch (error) {
    console.error('Main execution failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().then(() => {
    console.log('\nScript completed. Exiting...');
    process.exit(0);
  }).catch(error => {
    console.error('Script failed:', error);
    process.exit(1);
  });
}

module.exports = { 
  generateAllFAQEmbeddings, 
  verifyEmbeddings,
  generateEmbedding 
};
