const mongoose = require('mongoose');

// Sub-document schemas
const SubtaskSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  completed: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

const CommentSchema = new mongoose.Schema({
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, required: true, trim: true },
  createdAt: { type: Date, default: Date.now }
});

const TaskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['todo', 'in-progress', 'done'],
    default: 'todo'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  dueDate: {
    type: Date
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // ── Multi-user Assignees ──
  assignedTo: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  // ── Subtasks ──
  subtasks: [SubtaskSchema],
  // ── Task Dependencies (blocked by) ──
  blockedBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task'
  }],
  // ── Comments ──
  comments: [CommentSchema],
  // ── Recurring ──
  recurring: {
    enabled: { type: Boolean, default: false },
    frequency: { type: String, enum: ['daily', 'weekly', 'monthly'], default: 'weekly' }
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

TaskSchema.pre('findOneAndUpdate', function () {
  this.set({ updatedAt: new Date() });
});

module.exports = mongoose.model('Task', TaskSchema);
