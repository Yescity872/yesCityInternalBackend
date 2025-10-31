import mongoose from "mongoose";

const { Schema } = mongoose;

const festivalSchema = new Schema(
  {
    // Basic Info
    name: { 
      type: String, 
      required: true, 
      trim: true,
      unique: true 
    },
    city: { 
      type: String, 
      required: true 
    },
    state: { 
      type: String, 
      required: true 
    },
    country: { 
      type: String, 
      default: "India" 
    },
    
    // Festival Details
    date: { 
      type: String, 
      required: true 
    },
    duration_days: { 
      type: Number, 
      required: true 
    },
    category: { 
      type: String, 
      enum: ["Religious", "Religious Celebration", "Cultural", "Seasonal", "Regional", "National"],
      default: "Cultural"
    },
    about: { 
      type: String, 
      required: true 
    },
    importance: { 
      type: String, 
      required: true 
    },
    
    // Locations with Events
    locations: [
      {
        name: { 
          type: String, 
          required: true 
        },
        events: { 
          type: String  // Single event as string (can be comma-separated)
        },
        events_description: {
          type: String
        },
        timing: { 
          type: String 
        }
      }
    ],
    
    // Budget Estimates
    budget_estimate: {
      local_visitor: { 
        type: String 
      },
      traveller_from_other_city: { 
        type: String 
      },
      foreigner: { 
        type: String 
      }
    },
    
    // Travel Tips
    travel_tips: { 
      type: String  // Single string for travel tips
    },
    
    // Best Time
    best_experience_time: { 
      type: String 
    },
    
    // Media
    media: {
      images: [{ 
        type: String 
      }],
      videos: {
        full_video: { 
          type: String 
        },
        short_video: {  // Changed from short_clip to match JSON
          type: String 
        },
        drone_clip: { 
          type: String 
        }
      }
    },
    
    // Engagement & Premium
    engagement: {
      views: { 
        type: Number, 
        default: 0 
      },
      viewedBy: [
        {
          userId: { 
            type: Schema.Types.ObjectId, 
            ref: "User" 
          },
          timestamps: [{ 
            type: Date, 
            default: Date.now 
          }]
        }
      ]
    },
    reviews: [{ 
      type: Schema.Types.ObjectId, 
      ref: "Review" 
    }],
    premium: {
      type: String,
      enum: ["FREE", "A", "B"],
      default: "FREE"
    },
    
    // Metadata
    createdAt: { 
      type: Date, 
      default: Date.now 
    },
    updatedAt: { 
      type: Date, 
      default: Date.now 
    }
  },
  { timestamps: true }
);

// Indexes for faster queries
festivalSchema.index({ city: 1, name: 1 });
festivalSchema.index({ state: 1 });
festivalSchema.index({ category: 1 });

const Festival = mongoose.models.Festival || mongoose.model("Festival", festivalSchema);

export default Festival;