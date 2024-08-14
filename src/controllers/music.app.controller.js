const Project = require("../models/music.model");
const axios = require("axios");

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

exports.getMusicsByCategory = async (req, res, next) => {
  try {
    const { category } = req.query;
    const userEmail = req.user.email;
    const userPromotionDays = req.user.promotionDays;

    const response = await axios.get(`https://api.systeme.io/api/contacts?email=${userEmail}`, {
      headers: {
        'x-api-key': process.env.API_SYSTEME_KEY, // Replace with the actual API key
      },
    });

    const contacts = response.data?.items[0] ?? null;
    const userTags = contacts ? contacts.tags.map(tag => tag.name) : [];

    let query = {};
    let isPremium = true; // Default to true, change based on conditions below

    if (category) {
      query.categories = { $in: [category] };
    }

    // Initialize musicList array
    let musicList = [];

    // Check user's promotion days and contactWithTag status
    if (userPromotionDays < 7) {
      // If promotion days are less than 7, show all music
      musicList = await Project.find(query).populate('categories');
    } else {
      const hasFullAccess = hasAnyTag(userTags, fullAccessTags);
      const hasLimitedAccess = hasAnyTag(userTags, limitedAccessTags);

      if (hasFullAccess) {
        // Full access, show all music
        musicList = await Project.find(query).populate('categories');
      } else if (hasLimitedAccess) {
        // Limited access, show only non-premium and specific premium content
        
        musicList = await Project.find(query).populate('categories');
        isPremium = false; // Set isPremium to false as we are fetching non-premium music
      } else {
        // No specific access, show only non-premium music
       
        musicList = await Project.find(query).populate('categories');
        isPremium = false; // Set isPremium to false as we are fetching non-premium music
      }
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

    let query = { favorites: userId };
    let isPremium = true; // Default to true, change based on conditions below

    if (category) {
      query.categories = { $in: [category] };
    }

    let musicList = [];

    if (userPromotionDays < 7) {
      // If promotion days are less than 7, show all favorite music
      musicList = await Project.find(query).populate('categories');
    } else {
      const hasFullAccess = hasAnyTag(userTags, fullAccessTags);
      const hasLimitedAccess = hasAnyTag(userTags, limitedAccessTags);

      if (hasFullAccess) {
        // Full access, show all favorite music
        musicList = await Project.find(query).populate('categories');
      } else if (hasLimitedAccess) {
        // Limited access, show only non-premium and specific premium content in favorites
     
        musicList = await Project.find(query).populate('categories');
        isPremium = false; // Set isPremium to false as we are fetching non-premium music
      } else {
        // No specific access, show only non-premium favorite music
      
        musicList = await Project.find(query).populate('categories');
        isPremium = false; // Set isPremium to false as we are fetching non-premium music
      }
    }

    return res.status(200).json({ musicList, isPremium });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

