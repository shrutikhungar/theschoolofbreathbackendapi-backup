const Project = require("../models/music.model");
const fs = require("fs");

exports.getOne = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const projects = await Project.find();
    const data = await Project.findById(slug);
    

    return res.status(200).json(data);
  } catch (error) {
    next(error);
  }
};
exports.getAll = async (req, res, next) => {
  try {
   
    const data = await Project.aggregate([
      {
        $addFields: {
          isFavorite: {
            $cond: { if: { $in: [req.user._id, '$favorites'] }, then: 1, else: 0 }
          }
        }
      },
      { $sort: { isFavorite: -1 } },
      { $project: { sections: false } }
    ]);
    return res.status(200).json({ info: "OK", success: true, data: data });
  } catch (error) {
    next(error);
  }
};

exports.getAllAdmin = async (req, res, next) => {
  try {
   
    const data =  await Project.find()
    return res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ message: err.message });
  }
};

exports.getAllFavorites = async (req, res, next) => {
  try {
    const favorites = await Project.find({ favorites: req.user._id })
    return res.status(200).json({ data: favorites, success: true, info: "OK" })
  } catch (error) {
    return res.status(200).json({ data: favorites, success: true, info: "OK" })
  }
}

exports.getMusicsByCategory = async (req, res, next) => {
  try {
    const { category } = req.query;
    let query = {};

    if (category) {
        // Assuming 'category' is the ObjectId of the category
        query.categories = { $in: [category] };
    }

    const musicList = await Project.find(query).populate('categories');
    return res.status(200).json(musicList)
  } catch (error) {
    res.status(500).json({ message: err.message });
  }
}

exports.getAllFavoritesByCategory = async (req, res, next) => {
  try {
    const { category } = req.query; // Get the category from query parameters
    let query = { favorites: req.user._id };

    if (category) {
        // Assuming 'category' is the ObjectId or name of the category
        query.categories = { $in: [category] };
    }

    const favoriteProjects = await Project.find(query).populate('categories');
    return res.status(200).json(favoriteProjects);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

 
exports.position = async (req, res, next) => {
  try {
    const { id, position } = req.params;
    const project = await Project.findById(id);
    if (!project || !project._id)
      return res
        .status(400)
        .json({ success: false, info: "Project not found", data: {} });
    const positionNow = project.position;
    const projects = await Project.find({
      $or: [{ position: project.position }, { position: position }],
    });

    for (const key in projects) {
      if (Object.hasOwnProperty.call(projects, key)) {
        if (projects[key].position == positionNow) {
          projects[key].position = position;
          await projects[key].save();
        } else if (projects[key].position == position) {
          projects[key].position = positionNow;
          await projects[key].save();
        }
      }
    }

    const data = await Project.find()
      .sort({ position: 1 })
      .select({ sections: false });
    return res.status(200).json({ data: data, success: true, info: "OK" });
  } catch (error) {
    next(error);
  }
};
