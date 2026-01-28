import mongoose from "mongoose";

const { Schema } = mongoose;

const premiumSchema = new Schema({
  generalCityInfo: {
    type: String,
    enum: ["FREE", "GOLD", "DIAMOND"],
    default: "FREE",
  },
  connectivity: {
    type: String,
    enum: ["FREE", "GOLD", "DIAMOND"],
    default: "FREE",
  },
  placesToVisit: {
    type: String,
    enum: ["FREE", "GOLD", "DIAMOND"],
    default: "FREE",
  },
  nearbyTouristSpot: {
    type: String,
    enum: ["FREE", "GOLD", "DIAMOND"],
    default: "FREE",
  },
  activities: {
    type: String,
    enum: ["FREE", "GOLD", "DIAMOND"],
    default: "FREE",
  },
  itinerary: {
    type: String,
    enum: ["FREE", "GOLD", "DIAMOND"],
    default: "FREE",
  },
  food: {
    type: String,
    enum: ["FREE", "GOLD", "DIAMOND"],
    default: "FREE",
  },
  shopping: {
    type: String,
    enum: ["FREE", "GOLD", "DIAMOND"],
    default: "FREE",
  },
  accommodation: {
    type: String,
    enum: ["FREE", "GOLD", "DIAMOND"],
    default: "FREE",
  },
  localTransport: {
    type: String,
    enum: ["FREE", "GOLD", "DIAMOND"],
    default: "FREE",
  },
  hiddenGems: {
    type: String,
    enum: ["FREE", "GOLD", "DIAMOND"],
    default: "FREE",
  },
  miscellaneous: {
    type: String,
    enum: ["FREE", "GOLD", "DIAMOND"],
    default: "FREE",
  },
  contributions: {
    type: String,
    enum: ["FREE", "GOLD", "DIAMOND"],
    default: "FREE",
  },
});

export default premiumSchema;
