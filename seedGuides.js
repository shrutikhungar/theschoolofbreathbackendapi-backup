// seedGuides.js - Script to seed default guides data
const mongoose = require('mongoose');
const guideService = require('./src/services/guideService');
require('dotenv').config();

async function seedGuides() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/schoolofbreath');
    console.log('Connected to MongoDB');

    // Seed the guides
    const result = await guideService.seedDefaultGuides();
    
    console.log('✅ Guides seeded successfully!');
    console.log(`📊 Total guides created: ${result.count}`);
    console.log('📝 Guides created:');
    result.guides.forEach(guide => {
      console.log(`   - ${guide.name} (${guide.id}): ${guide.subtitle}`);
    });

    console.log('\n🎯 Guide Resources:');
    result.guides.forEach(guide => {
      console.log(`\n   ${guide.name}:`);
      console.log(`     Welcome GIF: ${guide.resources.welcome.gifUrl}`);
      console.log(`     Typing GIF: ${guide.resources.typing.gifUrl}`);
      console.log(`     Sent GIF: ${guide.resources.sent.gifUrl}`);
    });

  } catch (error) {
    console.error('❌ Error seeding guides:', error);
  } finally {
    // Close the connection
    await mongoose.connection.close();
    console.log('\n🔌 MongoDB connection closed');
  }
}

// Run the seeding
seedGuides(); 