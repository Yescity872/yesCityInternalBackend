// models/ChatMessage.js
import mongoose from 'mongoose';

const chatMessageSchema = new mongoose.Schema({
  groupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ChatGroup',
    required: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  username: {
    type: String,
    required: true // denormalized for performance
  },
  messageType: {
    type: String,
    enum: ['text', 'image', 'video'],
    default: 'text'
  },
  content: {
    type: String,
    required: function() {
      return this.messageType === 'text';
    },
    maxLength: 1000
  },
  mediaUrl: {
    type: String,
    required: function() {
      return this.messageType === 'image' || this.messageType === 'video';
    }
  },
  mediaFileName: {
    type: String
  },
  mediaSize: {
    type: Number, // in bytes
    validate: {
      validator: function(size) {
        if (this.messageType === 'image') {
          return size <= 5 * 1024 * 1024; // 5MB for images
        } else if (this.messageType === 'video') {
          return size <= 50 * 1024 * 1024; // 50MB for videos
        }
        return true;
      },
      message: 'File size exceeds limit'
    }
  },
  mediaType: {
    type: String, // 'image/jpeg', 'video/mp4', etc.
    validate: {
      validator: function(type) {
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
  editedAt: {
    type: Date
  },
  isDeleted: {
    type: Boolean,
    default: false
  }
});

// Indexes for performance
chatMessageSchema.index({ groupId: 1, createdAt: -1 });
chatMessageSchema.index({ userId: 1 });
chatMessageSchema.index({ createdAt: -1 });

// Virtual for formatted date
chatMessageSchema.virtual('formattedDate').get(function() {
  return this.createdAt.toLocaleDateString();
});

const ChatMessage = mongoose.models.ChatMessage || mongoose.model('ChatMessage', chatMessageSchema);

export default ChatMessage;