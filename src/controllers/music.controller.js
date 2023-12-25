const Project = require("../models/music.model");
const fs = require("fs");



exports.getOne = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const projects = await Project.find();
    const data = await Project.findOne({ slug: slug });
    for (const key in projects) {
      if (Object.hasOwnProperty.call(projects, key)) {
        if (projects[key]._id.toString() == data._id.toString()) {
          let index = key;
          let before =
            index > 0
              ? projects[index - 1].slug
              : projects[projects.length - 1].slug;
          index++;
          let after = projects[index] ? projects[index].slug : projects[0].slug;
          data.set("beforeAndAfter", {
            before: before,
            after: after,
          });
        }
      }
    }

    return res.status(200).json({ success: true, info: "OK", data: data });
  } catch (error) {
    next(error);
  }
};
exports.getAll = async (req, res, next) => {
  try {
    console.log(req.user._id)
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

exports.getContacts = async (req, res, next) => {
  try {
    const {email} = req.params
    const response = await axios.get(`https://api.systeme.io/api/contacts?email=${email}`, {
      headers: {
        'x-api-key': 'qmryzuqh25l5glxyrncs6yktyqjpyk3l90bn8004letbxxm7nuygb05gsqivr1la' // Replace with the actual API key
      }
    });
    
    return res.status(200).json({ info: "OK", success: true, data: response.data });
  } catch (error) {
    next(error);
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
