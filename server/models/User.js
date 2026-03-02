const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please fill a valid email address']
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  role: {
    type: String,
    enum: ['member', 'admin'],
    default: 'member'
  },
  avatar: {
    type: String,
    default: ''
  },
  title: {
    type: String,
    default: 'Member'
  },
  bio: {
    type: String,
    default: ''
  },
  skills: {
    type: [String],
    default: []
  },
  location: {
    type: String,
    default: ''
  },
  socialLinks: {
    linkedin: { type: String, default: '' },
    github: { type: String, default: '' },
    twitter: { type: String, default: '' }
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  resetToken: {
    type: String,
    default: null
  },
  resetTokenExpiry: {
    type: Date,
    default: null
  }
});

module.exports = mongoose.model('User', UserSchema);
