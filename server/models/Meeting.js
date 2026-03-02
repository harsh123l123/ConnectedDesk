const mongoose = require('mongoose');

const MeetingSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  dateTime: {
    type: Date,
    required: true
  },
  venue: {
    type: String, // Can be a physical location or a link (e.g., Zoom/Meet)
    required: true
  },
  organizer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  attendees: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  agenda: [{
    type: String
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Meeting', MeetingSchema);
