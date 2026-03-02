const router = require('express').Router();
const Message = require('../models/Message');
const Chat = require('../models/Chat');
const User = require('../models/User');
const verify = require('../middleware/auth');
const upload = require('../middleware/fileUpload');

// ─── Get all messages for a chat ───────────────────────────────────────────
router.get('/:chatId', verify, async (req, res) => {
  try {
    const messages = await Message.find({ chatId: req.params.chatId })
      .populate('sender', 'username email avatar')
      .populate('chatId')
      .populate('reactions.users', 'username')
      .populate('replyTo', 'content sender fileUrl')
      .populate('mentions', 'username')
      .populate('pinnedBy', 'username')
      .populate('readBy', 'username avatar');
    res.json(messages);
  } catch (error) {
    res.status(400).json({ msg: error.message });
  }
});

// ─── Get pinned messages for a chat ────────────────────────────────────────
router.get('/pinned/:chatId', verify, async (req, res) => {
  try {
    const messages = await Message.find({ chatId: req.params.chatId, isPinned: true })
      .populate('sender', 'username avatar')
      .populate('pinnedBy', 'username');
    res.json(messages);
  } catch (error) {
    res.status(400).json({ msg: error.message });
  }
});

// ─── Send a message ─────────────────────────────────────────────────────────
router.post('/', verify, upload.single('image'), async (req, res) => {
  const { content, chatId, replyTo, mentions } = req.body;
  let fileUrl = '';
  let fileType = '';

  if (req.file) {
    fileUrl = req.file.path.replace(/\\/g, '/');
    fileType = 'image';
  }

  if (!chatId || (!content && !fileUrl)) {
    return res.status(400).send('Message content or file is required');
  }

  // Parse @mentions
  let mentionIds = [];
  if (mentions) {
    try {
      mentionIds = JSON.parse(mentions);
    } catch (e) {
      mentionIds = [];
    }
  }

  try {
    let message = await Message.create({
      sender: req.user._id,
      content,
      chatId,
      fileUrl,
      fileType,
      replyTo: replyTo || null,
      mentions: mentionIds
    });

    message = await message.populate('sender', 'username avatar');
    message = await message.populate('chatId');
    message = await message.populate('replyTo', 'content sender fileUrl');
    message = await message.populate('mentions', 'username');
    message = await User.populate(message, {
      path: 'chatId.users',
      select: 'username email avatar',
    });

    await Chat.findByIdAndUpdate(chatId, { latestMessage: message });
    res.json(message);
  } catch (error) {
    res.status(400).json({ msg: error.message });
  }
});

// ─── Edit a message ──────────────────────────────────────────────────────────
router.put('/:messageId', verify, async (req, res) => {
  try {
    const message = await Message.findById(req.params.messageId);
    if (!message) return res.status(404).json({ msg: 'Message not found' });
    if (message.sender.toString() !== req.user._id.toString())
      return res.status(403).json({ msg: 'Not authorized to edit this message' });

    message.content = req.body.content;
    message.isEdited = true;
    message.editedAt = new Date();
    await message.save();

    const updated = await Message.findById(message._id)
      .populate('sender', 'username avatar')
      .populate('replyTo', 'content sender fileUrl')
      .populate('mentions', 'username')
      .populate('reactions.users', 'username');
    res.json(updated);
  } catch (error) {
    res.status(400).json({ msg: error.message });
  }
});

// ─── Delete a message (soft delete) ─────────────────────────────────────────
router.delete('/:messageId', verify, async (req, res) => {
  try {
    const message = await Message.findById(req.params.messageId);
    if (!message) return res.status(404).json({ msg: 'Message not found' });
    if (message.sender.toString() !== req.user._id.toString())
      return res.status(403).json({ msg: 'Not authorized to delete this message' });

    message.isDeleted = true;
    message.content = '';
    message.fileUrl = '';
    await message.save();
    res.json({ success: true, messageId: message._id });
  } catch (error) {
    res.status(400).json({ msg: error.message });
  }
});

// ─── Toggle pin a message ────────────────────────────────────────────────────
router.put('/pin/:messageId', verify, async (req, res) => {
  try {
    const message = await Message.findById(req.params.messageId);
    if (!message) return res.status(404).json({ msg: 'Message not found' });

    message.isPinned = !message.isPinned;
    message.pinnedBy = message.isPinned ? req.user._id : null;
    await message.save();

    const updated = await Message.findById(message._id)
      .populate('sender', 'username avatar')
      .populate('pinnedBy', 'username');
    res.json(updated);
  } catch (error) {
    res.status(400).json({ msg: error.message });
  }
});

// ─── Toggle emoji reaction ───────────────────────────────────────────────────
router.post('/react/:messageId', verify, async (req, res) => {
  const { emoji } = req.body;
  const userId = req.user._id;

  try {
    const message = await Message.findById(req.params.messageId);
    if (!message) return res.status(404).json({ msg: 'Message not found' });

    const existing = message.reactions.find(r => r.emoji === emoji);
    if (existing) {
      if (existing.users.map(u => u.toString()).includes(userId.toString())) {
        existing.users = existing.users.filter(u => u.toString() !== userId.toString());
        if (existing.users.length === 0) {
          message.reactions = message.reactions.filter(r => r.emoji !== emoji);
        }
      } else {
        existing.users.push(userId);
      }
    } else {
      message.reactions.push({ emoji, users: [userId] });
    }

    await message.save();
    const updated = await Message.findById(message._id).populate('reactions.users', 'username');
    res.json(updated.reactions);
  } catch (error) {
    res.status(400).json({ msg: error.message });
  }
});

// ─── Mark messages as read ───────────────────────────────────────────────────
router.put('/read/:chatId', verify, async (req, res) => {
  try {
    await Message.updateMany(
      { chatId: req.params.chatId, readBy: { $ne: req.user._id } },
      { $addToSet: { readBy: req.user._id } }
    );
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ msg: error.message });
  }
});

module.exports = router;
