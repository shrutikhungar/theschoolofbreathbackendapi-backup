const VideoContent = require("../models/video.content.model");

exports.createVideoContent = async (req, res) => {
  try {
    const { title, description, videoUrl, type, thumbnailUrl } = req.body;

    const content = new VideoContent({
      title,
      description,
      videoUrl,
      type,
      thumbnailUrl
    });

    await content.save();
    res.status(201).json({
      success: true,
      data: content
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.getAllVideoContent = async (req, res) => {
  try {
    const { type, page = 1, limit = 10 } = req.query;
    const query = {};
    
    if (type) {
      query.type = type;
    }

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: { position: 1, createdAt: -1 }
    };

    const content = await VideoContent.paginate(query, options);
    
    res.status(200).json({
      success: true,
      data: content
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.getVideoContentById = async (req, res) => {
  try {
    const content = await VideoContent.findById(req.params.id);
    if (!content) {
      return res.status(404).json({
        success: false,
        message: "Content not found"
      });
    }

    // Increment views
    content.views += 1;
    await content.save();

    res.status(200).json({
      success: true,
      data: content
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.updateVideoContent = async (req, res) => {
  try {
    const { title, description, videoUrl, type, thumbnailUrl, isActive } = req.body;
    
    const content = await VideoContent.findByIdAndUpdate(
      req.params.id,
      {
        title,
        description,
        videoUrl,
        type,
        thumbnailUrl,
        isActive
      },
      { new: true }
    );

    if (!content) {
      return res.status(404).json({
        success: false,
        message: "Content not found"
      });
    }

    res.status(200).json({
      success: true,
      data: content
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.deleteVideoContent = async (req, res) => {
  try {
    const content = await VideoContent.findByIdAndDelete(req.params.id);
    
    if (!content) {
      return res.status(404).json({
        success: false,
        message: "Content not found"
      });
    }

    res.status(200).json({
      success: true,
      message: "Content deleted successfully"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.updatePosition = async (req, res) => {
  try {
    const { items } = req.body;
    
    for (const item of items) {
      await VideoContent.findByIdAndUpdate(item.id, {
        position: item.position
      });
    }

    res.status(200).json({
      success: true,
      message: "Positions updated successfully"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.toggleFavorite = async (req, res) => {
  try {
    const content = await VideoContent.findById(req.params.id);
    if (!content) {
      return res.status(404).json({
        success: false,
        message: "Content not found"
      });
    }

    const userId = req.user._id;
    const isFavorited = content.favorites.includes(userId);

    if (isFavorited) {
      content.favorites = content.favorites.filter(id => id.toString() !== userId.toString());
    } else {
      content.favorites.push(userId);
    }

    await content.save();

    res.status(200).json({
      success: true,
      data: content
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};