import mongoose from "mongoose";

const { Schema } = mongoose;

const connectivitySchema = new Schema({
  cityId: { type: Schema.Types.ObjectId, ref: 'City', required: true },
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

  reviews: [{ type: Schema.Types.ObjectId, ref: 'Review' }],

  nearestAirportStationBusStand: { type: String },
  distance: { type: String },

  lat: { type: Number },
  lon: { type: Number },

  locationLink: { type: String},
  majorFlightsTrainsBuses: { type: String },

  premium: {
    type: String,
    enum: ["FREE", "A", "B"],
    default: "FREE"
  },
});

const Connectivity =
  mongoose.models.Connectivity || mongoose.model("Connectivity", connectivitySchema);

export default Connectivity;
