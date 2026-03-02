const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  chatId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Chat',
    required: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    trim: true
  },
  fileUrl: {
    type: String,
    default: ''
  },
  fileType: {
    type: String,
    default: ''
  },
  readBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  reactions: [{
    emoji: String,
    users: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
  }],
  // ── Reply / Thread ──
  replyTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message',
    default: null
  },
  // ── Edit ──
  isEdited: {
    type: Boolean,
    default: false
  },
  editedAt: {
    type: Date,
    default: null
  },
  // ── Delete ──
  isDeleted: {
    type: Boolean,
    default: false
  },
  // ── Pin ──
  isPinned: {
    type: Boolean,
    default: false
  },
  pinnedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  // ── @Mentions ──
  mentions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Message', MessageSchema);
