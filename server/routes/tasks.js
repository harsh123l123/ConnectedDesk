const router = require('express').Router();
const Task = require('../models/Task');
const User = require('../models/User');
const verify = require('../middleware/auth');

// ─── Get all tasks for user (own + assigned) ─────────────────────────────────
router.get('/', verify, async (req, res) => {
  try {
    const tasks = await Task.find({
      $or: [{ user: req.user._id }, { assignedTo: req.user._id }]
    })
      .populate('assignedTo', 'username avatar email')
      .populate('user', 'username avatar')
      .populate('comments.author', 'username avatar')
      .populate('blockedBy', 'title status');
    res.json(tasks);
  } catch (err) {
    res.status(400).send('Error fetching tasks');
  }
});

// ─── Create task ──────────────────────────────────────────────────────────────
router.post('/', verify, async (req, res) => {
  const {
    title, description, status, priority, dueDate,
    assignedTo, recurring, subtasks
  } = req.body;

  const task = new Task({
    title,
    description,
    status,
    priority,
    dueDate,
    user: req.user._id,
    assignedTo: assignedTo || [],
    recurring: recurring || { enabled: false, frequency: 'weekly' },
    subtasks: subtasks || []
  });

  try {
    const saved = await task.save();
    const populated = await Task.findById(saved._id)
      .populate('assignedTo', 'username avatar email')
      .populate('user', 'username avatar')
      .populate('comments.author', 'username avatar');
    res.json(populated);
  } catch (err) {
    res.status(400).send('Error creating task');
  }
});

// ─── Update task ──────────────────────────────────────────────────────────────
router.put('/:id', verify, async (req, res) => {
  try {
    const {
      title, description, status, priority, dueDate,
      assignedTo, recurring, blockedBy
    } = req.body;

    const updateFields = {};
    if (title !== undefined) updateFields.title = title;
    if (description !== undefined) updateFields.description = description;
    if (status !== undefined) updateFields.status = status;
    if (priority !== undefined) updateFields.priority = priority;
    if (dueDate !== undefined) updateFields.dueDate = dueDate;
    if (assignedTo !== undefined) updateFields.assignedTo = assignedTo;
    if (recurring !== undefined) updateFields.recurring = recurring;
    if (blockedBy !== undefined) updateFields.blockedBy = blockedBy;

    const updatedTask = await Task.findOneAndUpdate(
      { _id: req.params.id, $or: [{ user: req.user._id }, { assignedTo: req.user._id }] },
      { $set: updateFields },
      { new: true }
    )
      .populate('assignedTo', 'username avatar email')
      .populate('user', 'username avatar')
      .populate('comments.author', 'username avatar')
      .populate('blockedBy', 'title status');

    if (!updatedTask) return res.status(404).send('Task not found');
    res.json(updatedTask);
  } catch (err) {
    res.status(400).send('Error updating task');
  }
});

// ─── Delete task ──────────────────────────────────────────────────────────────
router.delete('/:id', verify, async (req, res) => {
  try {
    await Task.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    res.send('Task Deleted');
  } catch (err) {
    res.status(400).send('Error deleting task');
  }
});

// ─── Add subtask ──────────────────────────────────────────────────────────────
router.post('/:id/subtasks', verify, async (req, res) => {
  try {
    const task = await Task.findOne({
      _id: req.params.id,
      $or: [{ user: req.user._id }, { assignedTo: req.user._id }]
    });
    if (!task) return res.status(404).send('Task not found');

    task.subtasks.push({ title: req.body.title });
    await task.save();
    res.json(task.subtasks);
  } catch (err) {
    res.status(400).send('Error adding subtask');
  }
});

// ─── Toggle subtask completion ─────────────────────────────────────────────────
router.put('/:id/subtasks/:subtaskId', verify, async (req, res) => {
  try {
    const task = await Task.findOne({
      _id: req.params.id,
      $or: [{ user: req.user._id }, { assignedTo: req.user._id }]
    });
    if (!task) return res.status(404).send('Task not found');

    const sub = task.subtasks.id(req.params.subtaskId);
    if (!sub) return res.status(404).send('Subtask not found');
    sub.completed = !sub.completed;
    await task.save();
    res.json(task.subtasks);
  } catch (err) {
    res.status(400).send('Error updating subtask');
  }
});

// ─── Delete subtask ────────────────────────────────────────────────────────────
router.delete('/:id/subtasks/:subtaskId', verify, async (req, res) => {
  try {
    const task = await Task.findOne({
      _id: req.params.id,
      $or: [{ user: req.user._id }, { assignedTo: req.user._id }]
    });
    if (!task) return res.status(404).send('Task not found');

    task.subtasks = task.subtasks.filter(s => s._id.toString() !== req.params.subtaskId);
    await task.save();
    res.json(task.subtasks);
  } catch (err) {
    res.status(400).send('Error deleting subtask');
  }
});

// ─── Add comment ───────────────────────────────────────────────────────────────
router.post('/:id/comments', verify, async (req, res) => {
  try {
    const task = await Task.findOne({
      _id: req.params.id,
      $or: [{ user: req.user._id }, { assignedTo: req.user._id }]
    });
    if (!task) return res.status(404).send('Task not found');

    task.comments.push({ author: req.user._id, content: req.body.content });
    await task.save();

    const updated = await Task.findById(task._id).populate('comments.author', 'username avatar');
    res.json(updated.comments);
  } catch (err) {
    res.status(400).send('Error adding comment');
  }
});

// ─── Delete comment ────────────────────────────────────────────────────────────
router.delete('/:id/comments/:commentId', verify, async (req, res) => {
  try {
    const task = await Task.findOne({
      _id: req.params.id,
      $or: [{ user: req.user._id }, { assignedTo: req.user._id }]
    });
    if (!task) return res.status(404).send('Task not found');

    task.comments = task.comments.filter(c => c._id.toString() !== req.params.commentId);
    await task.save();
    res.json({ success: true });
  } catch (err) {
    res.status(400).send('Error deleting comment');
  }
});

module.exports = router;
