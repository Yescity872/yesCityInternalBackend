// models/BuddyMessage.js
import mongoose from 'mongoose';

const buddyMessageSchema = new mongoose.Schema({
  conversationId: {
    type: String,
    required: true,
    index: true // 🔑 very important for fast lookups
  },
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  receiverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  senderName: {
    type: String,
    required: true
  },
  messageType: {
    type: String,
    enum: ['text', 'image', 'video'],
    default: 'text'
  },
  content: {
    type: String,
    required: function () {
      return this.messageType === 'text';
    },
    maxLength: 1000
  },
  mediaUrl: {
    type: String,
    required: function () {
      return this.messageType === 'image' || this.messageType === 'video';
    }
  },
  mediaFileName: String,
  mediaSize: {
    type: Number,
    validate: {
      validator: function (size) {
        if (this.messageType === 'image') {
          return size <= 5 * 1024 * 1024; // 5MB
        } else if (this.messageType === 'video') {
          return size <= 50 * 1024 * 1024; // 50MB
        }
        return true;
      },
      message: 'File size exceeds limit'
    }
  },
  mediaType: {
    type: String,
    validate: {
      validator: function (type) {
        if (this.messageType === 'image') {
          return ['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(type);
        } else if (this.messageType === 'video') {
          return ['video/mp4', 'video/webm', 'video/mov', 'video/avi'].includes(type);
        }
        return true;
      },
      message: 'Invalid media type'
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  editedAt: Date,
  isDeleted: {
    type: Boolean,
    default: false
  }
});

// Indexes
buddyMessageSchema.index({ conversationId: 1, createdAt: -1 });

// Virtual for formatted date
buddyMessageSchema.virtual('formattedDate').get(function () {
  return this.createdAt.toLocaleDateString();
});

const BuddyMessage =
  mongoose.models.BuddyMessage || mongoose.model('BuddyMessage', buddyMessageSchema);

export default BuddyMessage;
