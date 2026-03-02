const router = require('express').Router();
const User = require('../models/User');
const verify = require('../middleware/auth');
const upload = require('../middleware/fileUpload'); // Reuse existing middleware

// Get all users (for searching to chat)
router.get('/', verify, async (req, res) => {
  try {
    const keyword = req.query.search
      ? {
        $or: [
          { username: { $regex: req.query.search, $options: "i" } },
          { email: { $regex: req.query.search, $options: "i" } },
        ],
      }
      : {};
    const users = await User.find(keyword).find({ _id: { $ne: req.user._id } }).select("-password");
    res.send(users);
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
});

// Get User Profile (Me)
router.get('/me', verify, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    res.json(user);
  } catch (err) {
    res.status(500).send('Server Error');
  }
});

// Update User Profile
router.put('/profile', verify, upload.single('avatar'), async (req, res) => {
  try {
    const { username, title, bio, location, linkedin, github, twitter, addSkill, removeSkill } = req.body;

    // Find user first to manipulate complex fields
    let user = await User.findById(req.user._id);

    if (!user) return res.status(404).json({ msg: 'User not found' });

    // Update basic fields
    if (username) user.username = username;
    if (title) user.title = title;
    if (bio) user.bio = bio;
    if (location) user.location = location;

    // Handle nested social links
    if (linkedin !== undefined) user.socialLinks.linkedin = linkedin;
    if (github !== undefined) user.socialLinks.github = github;
    if (twitter !== undefined) user.socialLinks.twitter = twitter;

    // Handle avatar upload
    if (req.file) {
      user.avatar = req.file.path.replace(/\\/g, "/"); // Normalize path
    }

    // Handle skills (add/remove logic)
    // If sent as a JSON string array (when using simple form data)
    try {
      if (req.body.skills) {
        const parsedSkills = JSON.parse(req.body.skills);
        if (Array.isArray(parsedSkills)) {
          user.skills = parsedSkills;
        }
      }
    } catch (e) {
      // If not JSON, maybe adding one by one logic if needed, but array replacement is easier
    }

    // Or specific add/remove instructions
    if (addSkill && !user.skills.includes(addSkill)) {
      user.skills.push(addSkill);
    }
    if (removeSkill) {
      user.skills = user.skills.filter(s => s !== removeSkill);
    }

    await user.save();

    // Return user without password
    const userResponse = user.toObject();
    delete userResponse.password;

    res.json(userResponse);

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
