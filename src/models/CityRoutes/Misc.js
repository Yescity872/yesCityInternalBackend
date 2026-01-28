import mongoose from "mongoose";

const { Schema } = mongoose;

const miscellaneousSchema = new Schema({
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

  reviews: [{ type: Schema.Types.ObjectId, ref: "Review" }],

  localMap: { type: String },
  emergencyContacts: { type: String },

  hospital: { type: String },
  hospitalLocationLink: { type: String },
  hospitalLat: { type: Number },
  hospitalLon: { type: Number },

  Police: { type: String },
  PoliceLocationLink: { type: String },
  PoliceLat: { type: Number },
  PoliceLon: { type: Number },


  parking: { type: String },
  parkingLocationLink: {type: String},
  parkingLat: { type: Number },
  parkingLon: { type: Number },

  publicWashrooms: { type: String },
  publicWashroomsLocationLink: {type: String},
  publicWashroomsLat: { type: Number },
  publicWashroomsLon: { type: Number },

  locker: {type: String},
  lockerLocationLink: {type: String},
  lockerLat: { type: Number },
  lockerLon: { type: Number },


  premium: {
    type: String,
    enum: ["FREE", "A", "B"],
    default: "FREE"
  }
});

const Miscellaneous =
  mongoose.models.Miscellaneous ||
  mongoose.model("Miscellaneous", miscellaneousSchema);

export default Miscellaneous;
