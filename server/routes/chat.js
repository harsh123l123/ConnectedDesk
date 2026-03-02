const router = require('express').Router();
const mongoose = require('mongoose');
const Chat = require('../models/Chat');
const User = require('../models/User');
const Message = require('../models/Message');
const verify = require('../middleware/auth');

// Access or Create a Chat (One-on-One)
router.post('/', verify, async (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).send({ message: 'UserId param not sent with request' });

  try {
    let isChat = await Chat.find({
      isGroupChat: false,
      $and: [
        { users: { $elemMatch: { $eq: req.user._id } } },
        { users: { $elemMatch: { $eq: userId } } },
      ],
    })
      .populate('users', '-password')
      .populate({
        path: 'latestMessage',
        populate: {
          path: 'sender',
          select: 'username email avatar'
        }
      });

    if (isChat.length > 0) {
      res.send(isChat[0]);
    } else {
      const createdChat = await Chat.create({
        chatName: 'sender',
        isGroupChat: false,
        users: [req.user._id, userId]
      });
      const fullChat = await Chat.findOne({ _id: createdChat._id }).populate('users', '-password');
      res.status(200).send(fullChat);
    }
  } catch (error) {
    res.status(500).json({ msg: error.message });
  }
});

// Fetch all chats for a user
router.get('/', verify, async (req, res) => {
  try {
    let results = await Chat.find({ users: { $elemMatch: { $eq: req.user._id } } })
      .populate('users', '-password')
      .populate('groupAdmin', '-password')
      .populate({
        path: 'latestMessage',
        populate: {
          path: 'sender',
          select: 'username email avatar'
        }
      })
      .sort({ updatedAt: -1 });

    if (!results || results.length === 0) {
      return res.status(200).send([]);
    }

    const chatIds = results.map(c => c._id);

    // Efficiently aggregate unread counts
    const unreadCounts = await Message.aggregate([
      {
        $match: {
          chatId: { $in: chatIds },
          readBy: { $ne: new mongoose.Types.ObjectId(String(req.user._id)) }
        }
      },
      { $group: { _id: '$chatId', count: { $sum: 1 } } }
    ]);

    const chatsWithUnread = results.map(chat => {
      const unread = unreadCounts.find(u => u._id.toString() === chat._id.toString());
      return {
        ...chat.toObject(),
        unreadCount: unread ? unread.count : 0
      };
    });

    res.status(200).send(chatsWithUnread);
  } catch (error) {
    console.error('Fetch Chats Error:', error);
    res.status(500).json({ msg: error.message });
  }
});

// Create Group Chat
router.post('/group', verify, async (req, res) => {
  if (!req.body.users || !req.body.name) {
    return res.status(400).send({ message: 'Please fill all the fields' });
  }
  var users = JSON.parse(req.body.users);
  if (users.length < 2) return res.status(400).send('More than 2 users are required to form a group chat');
  users.push(req.user);
  try {
    const groupChat = await Chat.create({ chatName: req.body.name, users, isGroupChat: true, groupAdmin: req.user });
    const fullGroupChat = await Chat.findOne({ _id: groupChat._id })
      .populate('users', '-password')
      .populate('groupAdmin', '-password');
    res.status(200).json(fullGroupChat);
  } catch (error) {
    res.status(400).json({ msg: error.message });
  }
});

// Rename Group (admin only)
router.put('/group/rename', verify, async (req, res) => {
  const { chatId, chatName } = req.body;
  try {
    const chat = await Chat.findById(chatId);
    if (!chat) return res.status(404).json({ msg: 'Chat not found' });
    if (chat.groupAdmin.toString() !== req.user._id.toString()) {
      return res.status(403).json({ msg: 'Only the group admin can rename the group' });
    }
    const updated = await Chat.findByIdAndUpdate(chatId, { chatName }, { new: true })
      .populate('users', '-password')
      .populate('groupAdmin', '-password');
    res.json(updated);
  } catch (error) {
    res.status(400).json({ msg: error.message });
  }
});

// Remove Member OR Leave Group
router.put('/group/remove', verify, async (req, res) => {
  const { chatId, userId } = req.body;
  try {
    const chat = await Chat.findById(chatId);
    if (!chat) return res.status(404).json({ msg: 'Chat not found' });
    const isAdmin = chat.groupAdmin.toString() === req.user._id.toString();
    const isSelf = userId === req.user._id.toString();
    if (!isAdmin && !isSelf) return res.status(403).json({ msg: 'Not authorized' });

    const updated = await Chat.findByIdAndUpdate(
      chatId,
      { $pull: { users: userId } },
      { new: true }
    ).populate('users', '-password').populate('groupAdmin', '-password');
    res.json(updated);
  } catch (error) {
    res.status(400).json({ msg: error.message });
  }
});

module.exports = router;
