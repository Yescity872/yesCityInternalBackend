// models/ChatGroup.js
import mongoose from 'mongoose';

const chatGroupSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxLength: 50
  },
  description: {
    type: String,
    trim: true,
    maxLength: 200
  },
  cityId: {
    type: String,
    required: true,
    index: true
  },
  isPrivate: {
    type: Boolean,
    default: false
  },
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  memberCount: {
    type: Number,
    default: 1, // admin is first member
    min: 0
  },
  maxMembers: {
    type: Number,
    default: function() {
      return this.isPrivate ? 100 : null; // 100 for private, unlimited for public
    }
  },
  lastActivity: {
    type: Date,
    default: Date.now
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: { updatedAt: 'updatedAt' }
});

// Indexes for performance
chatGroupSchema.index({ cityId: 1, isPrivate: 1 });
chatGroupSchema.index({ adminId: 1 });
chatGroupSchema.index({ lastActivity: -1 });

// Pre-save middleware to update lastActivity
chatGroupSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

const ChatGroup = mongoose.models.ChatGroup || mongoose.model('ChatGroup', chatGroupSchema);

export default ChatGroup;