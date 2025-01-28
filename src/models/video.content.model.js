const { Schema, model } = require("mongoose");
const mongoosePaginate = require("mongoose-paginate-v2");

const VideoContent = new Schema(
  {
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      default: "",
    },
    videoUrl: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ['mantra', 'youtube'],
      required: true
    },
    thumbnailUrl: {
      type: String,
      default: ""
    },
    position: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true
    },
    views: {
      type: Number,
      default: 0
    },
    favorites: [{ 
      type: Schema.Types.ObjectId, 
      ref: "User" 
    }]
  },
  {
    timestamps: true,
    toObject: { virtuals: true, getters: true },
    toJSON: { virtuals: true },
  }
);

VideoContent.plugin(mongoosePaginate);
const VideoContentSchema = model("VideoContent", VideoContent);
module.exports = VideoContentSchema;