const { Schema, model } = require("mongoose");
const removeSpecialChars = require("../utils/slugify");

const Category = new Schema(
  {
    name: {
      type: String,
      default: "",
    },
    slug: {
      type: String,
      default: function () {
        let text = removeSpecialChars(this.name);
        return text;
      },
    },
   
  },
 
);


const CategorySchema = model("Category", Category);

module.exports = CategorySchema;
