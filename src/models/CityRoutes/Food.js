import mongoose from "mongoose";

const { Schema } = mongoose;

const foodSchema = new Schema({
  cityId: { type: Schema.Types.ObjectId, ref: "City", required: true },
  cityName: { type: String },

  engagement: {
    views: { type: Number, default: 0 },
    viewedBy: [
      {
        userId: { type: Schema.Types.ObjectId, ref: "User" },
        timestamps: [{ type: Date, default: Date.now }]
      }
    ]
  },

  flagship: { type: Boolean, default: false },

  reviews: [{ type: Schema.Types.ObjectId, ref: "Review" }],

  foodPlace: { type: String, required: true },
  lat: { type: Number },
  lon: { type: Number},
  address: { type: String, required: true },
  locationLink: { type: String },

  category: { type: String },
  vegOrNonVeg: { type: String, enum: ["Veg", "Non-Veg", "Both"] },

  valueForMoney: { type: Number, min: 1, max: 5 },
  service: { type: Number, min: 1, max: 5 },
  taste: { type: Number, min: 1, max: 5 },
  hygiene: { type: Number, min: 1, max: 5 },

  menuSpecial: { type: String },
  menuLink: { type: String },
  openDay: { type: String },
  openTime: { type: String },
  phone: { type: String },
  website: { type: String },
  description: { type: String },

  images: [{ type: String }],
  videos: [{ type: String }],

  premium: {
    type: String,
    enum: ["FREE", "A", "B"],
    default: "FREE"
  }
});

const Food = mongoose.models.Food || mongoose.model("Food", foodSchema);

export default Food;
