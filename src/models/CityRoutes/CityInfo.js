import mongoose from "mongoose";

const { Schema } = mongoose;

const generalCityInfoSchema = new Schema({
  cityId: { type: Schema.Types.ObjectId, ref: 'City', required: true },
  reviews: [{ type: Schema.Types.ObjectId, ref: 'Review' }],

  engagement: {
    views: { type: Number, default: 0 },
    viewedBy: [
      {
        userId: { type: Schema.Types.ObjectId, ref: "User" },
        timestamps: [{ type: Date, default: Date.now }]
      }
    ]
  },
 
  cityName: { type: String, required: true },
  stateOrUT: { type: String, required: true },
  alternateNames: [{ type: String }],
  languagesSpoken: [{ type: String, required: true }],
  climateInfo: { type: String, required: true },
  bestTimeToVisit: { type: String, required: true },
  cityHistory: { type: String, required: true },
  coverImage: { type: String, required: true },

  premium: {
    type: String,
    enum: ["FREE", "A", "B"],
    default: "FREE"
  },
});

const CityInfo =
  mongoose.models.CityInfo || mongoose.model("CityInfo", generalCityInfoSchema);

export default CityInfo;
