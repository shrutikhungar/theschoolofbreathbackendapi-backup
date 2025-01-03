const Music = require("../models/music.model");
const axios = require("axios");
const Category = require('../models/categories.model')
const fullAccessTags = [
  'Enrolled_to_Membership',
  'Enrolled_Holistic Membership',
  'Enrolled_Swara Yoga Membership',
  'UPIPayerMonthly',
  'UPIPayerAnnual',
  'Order Bump - Monthly Holistic Membership',
  'Enrolled_to_Sleep_Membership',
];

const limitedAccessTags = [
  'Purchased_9-Day Breathwork Course',
  'Purchased_9-Day Meditation Course'
];

const hasAnyTag = (userTags, tagsToCheck) => {
  return tagsToCheck.some(tag => userTags.includes(tag));
};

exports.getPreviewMusicsByCategory = async (req, res, next) => {
  try {
    const { category } = req.query;
    let query = { typeContent: 'app' };  // Add this line

    if (category) {
      query.categories = { $in: [category] };
    }

    const musicList = await Music.find(query).populate('categories');

    return res.status(200).json({ musicList, isPremium: false });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getMusicsByCategory = async (req, res, next) => {
  try {
    const { category } = req.query;
    const userEmail = req.user.email;
// First, get the shakra category ObjectId
const shakraCategory = await Category.findOne({ name: 'shakra' });
if (!shakraCategory) {
  return res.status(404).json({ message: "Shakra category not found" });
}
    const response = await axios.get(`https://api.systeme.io/api/contacts?email=${userEmail}`, {
      headers: {
        'x-api-key': process.env.API_SYSTEME_KEY, // Replace with the actual API key
      },
    });

    const contacts = response.data?.items[0] ?? null;
    const userTags = contacts ? contacts.tags.map(tag => tag.name) : [];

  

      // Base query with typeContent and excluding shakra category
      let query = { 
        typeContent: 'app',
        categories: { $ne: shakraCategory._id }
      };
      // If a specific category is requested
     // If category is provided, add it as an additional filter
     if (category) {
      const requestedCategory = await Category.findOne({ name: category });
      if (requestedCategory) {
        // If category exists, add it to the query while maintaining shakra exclusion
        query.categories = {
          $all: [requestedCategory._id],
          $ne: shakraCategory._id
        };
      }
      // If category doesn't exist, keep only the shakra exclusion (showing all other music)
    }
    let isPremium = true; // Default to true, change based on conditions below


    // Initialize musicList array
    let musicList = [];

    const hasFullAccess = hasAnyTag(userTags, fullAccessTags);
      const hasLimitedAccess = hasAnyTag(userTags, limitedAccessTags);

      if (hasFullAccess) {
        // Full access, show all music
        musicList = await Music.find(query).populate('categories');
      } else if (hasLimitedAccess) {
        // Limited access, show only non-premium and specific premium content
        
        musicList = await Music.find(query).populate('categories');
        isPremium = false; // Set isPremium to false as we are fetching non-premium music
      } else {
        // No specific access, show only non-premium music
       
        musicList = await Music.find(query).populate('categories');
        isPremium = false; // Set isPremium to false as we are fetching non-premium music
      }

    return res.status(200).json({ musicList, isPremium });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getAllFavoritesByCategory = async (req, res, next) => {
  try {
    const { category } = req.query;
    const userEmail = req.user.email;
    const userId = req.user._id;
    const userPromotionDays = req.user.promotionDays;

    const response = await axios.get(`https://api.systeme.io/api/contacts?email=${userEmail}`, {
      headers: {
        'x-api-key': process.env.API_SYSTEME_KEY, // Replace with the actual API key
      },
    });

    const contacts = response.data?.items[0] ?? null;
    const userTags = contacts ? contacts.tags.map(tag => tag.name) : [];

    let query = { favorites: userId ,typeContent: 'app'};
    let isPremium = true; // Default to true, change based on conditions below

    if (category) {
      query.categories = { $in: [category] };
    }

    let musicList = [];

    const hasFullAccess = hasAnyTag(userTags, fullAccessTags);
      const hasLimitedAccess = hasAnyTag(userTags, limitedAccessTags);

      if (hasFullAccess) {
        // Full access, show all favorite music
        musicList = await Music.find(query).populate('categories');
      } else if (hasLimitedAccess) {
        // Limited access, show only non-premium and specific premium content in favorites
     
        musicList = await Music.find(query).populate('categories');
        isPremium = false; // Set isPremium to false as we are fetching non-premium music
      } else {
        // No specific access, show only non-premium favorite music
      
        musicList = await Music.find(query).populate('categories');
        isPremium = false; // Set isPremium to false as we are fetching non-premium music
      }

    return res.status(200).json({ musicList, isPremium });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};



exports.getShakraMusicByCategory = async (req, res, next) => {
  try {
    const userEmail = req.user.email;
    const userId = req.user._id;

    // First, get the shakra category ObjectId
    const shakraCategory = await Category.findOne({ name: 'shakra' });
    if (!shakraCategory) {
      return res.status(404).json({ message: "Shakra category not found in system" });
    }

    // Get user tags from Systeme.io
    const response = await axios.get(`https://api.systeme.io/api/contacts?email=${userEmail}`, {
      headers: {
        'x-api-key': process.env.API_SYSTEME_KEY,
      },
    });

    const contacts = response.data?.items[0] ?? null;
    const userTags = contacts ? contacts.tags.map(tag => tag.name) : [];

    // Base query for Shakra music using ObjectId
    let query = {
      typeContent: 'app',
      categories: shakraCategory._id  // Use the ObjectId directly
    };
    
    let isPremium = true;
    let musicList = [];

    const hasFullAccess = hasAnyTag(userTags, fullAccessTags);
    const hasLimitedAccess = hasAnyTag(userTags, limitedAccessTags);

    if (hasFullAccess) {
      // Full access members can see all Shakra music
      musicList = await Music.find(query).populate('categories');
    } else if (hasLimitedAccess) {
      // Limited access members see non-premium Shakra music
      musicList = await Music.find(query).populate('categories');
      isPremium = false;
    } else {
      // Non-members see only non-premium Shakra music
      musicList = await Music.find(query).populate('categories');
      isPremium = false;
    }

    // Add total count to response
    const totalCount = musicList.length;

    // Optional: Add pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;

    const paginatedMusic = musicList.slice(startIndex, endIndex);

    return res.status(200).json({
      musicList: paginatedMusic,
      isPremium,
      totalCount,
      currentPage: page,
      totalPages: Math.ceil(totalCount / limit)
    });

  } catch (error) {
    console.error('Error in getShakraMusicByCategory:', error);
    res.status(500).json({ 
      message: 'Failed to fetch Shakra music',
      error: error.message 
    });
  }
};