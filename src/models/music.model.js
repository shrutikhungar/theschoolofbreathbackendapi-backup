const { Schema, model } = require("mongoose");
const mongoosePaginate = require("mongoose-paginate-v2");
const state = ["pendiente", "aprobada", "declinada", "completado", "pagado"];
const paymentMethods = ["pse", "card", "efectivo", "banco"];
const purchasesTypes = ["venta", "compra", "otc", "giro"];
const { v4: uuidv4 } = require("uuid");
const removeSpecialChars = require("../utils/slugify");
/**
 * Countries Schema
 * @private
 */
const Music = new Schema(
  {
    name: {
      type: String,
      default: "",
    },
    poster: {
      type: String,
      default: "",
    },
    description: {
      type: String,
      default: "",
    },
    link: {
      type: String,
      required: true,
    },
    slug: {
      type: String,
      default: function () {
        let text = removeSpecialChars(this.name);
        return text;
      },
    },
    position: {
      type: Number,
      default: 0,
    },
    favorites: [{ type: Schema.Types.ObjectId, ref: "User" }]
  },
  {
    timestamps: true,
    toObject: { virtuals: true, getters: true },
    toJSON: { virtuals: true },
  }
);


const MusicSchema = model("Music", Music);

module.exports = MusicSchema;
