const router = require('express').Router();
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// REGISTER
router.post('/register', async (req, res) => {
  try {
    // Check if user exists
    const emailExist = await User.findOne({ email: req.body.email });
    if (emailExist) return res.status(400).send('Email already exists');

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(req.body.password, salt);

    // Create user
    const user = new User({
      username: req.body.username,
      email: req.body.email,
      password: hashedPassword,
      role: req.body.role || 'member'
    });

    const savedUser = await user.save();
    res.send({ user: user._id, username: user.username });
  } catch (err) {
    console.error('Register Error:', err);
    res.status(500).send({ message: 'Error registering user', error: err.message });
  }
});

// LOGIN
router.post('/login', async (req, res) => {
  try {
    // Check if user exists
    const user = await User.findOne({ email: req.body.email });
    if (!user) return res.status(400).send('Email is not found');

    // Check password
    const validPass = await bcrypt.compare(req.body.password, user.password);
    if (!validPass) return res.status(400).send('Invalid password');

    // Create and assign token
    const token = jwt.sign({ _id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.header('auth-token', token).send({
      token,
      user: { _id: user._id, username: user.username, email: user.email, role: user.role, avatar: user.avatar }
    });
  } catch (err) {
    console.error('Login Error:', err);
    res.status(500).send({ message: 'Error logging in', error: err.message });
  }
});

// FORGOT PASSWORD — generates a reset token (no email needed for local dev)
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required' });

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(404).json({ message: 'No account found with that email address' });

    // Generate a simple 6-digit OTP token
    const token = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    user.resetToken = token;
    user.resetTokenExpiry = expiry;
    await user.save();

    // In a real app you'd email this token.
    // For college project, we return it directly so the user can use it.
    res.json({
      message: 'Reset token generated successfully',
      token,           // shown to user directly (no email server needed)
      username: user.username
    });
  } catch (err) {
    console.error('Forgot Password Error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// RESET PASSWORD — validates token and sets new password
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) return res.status(400).json({ message: 'Token and new password are required' });
    if (newPassword.length < 6) return res.status(400).json({ message: 'Password must be at least 6 characters' });

    const user = await User.findOne({
      resetToken: token,
      resetTokenExpiry: { $gt: new Date() } // token not expired
    });

    if (!user) return res.status(400).json({ message: 'Invalid or expired reset token' });

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    user.resetToken = null;
    user.resetTokenExpiry = null;
    await user.save();

    res.json({ message: 'Password reset successfully! You can now log in.' });
  } catch (err) {
    console.error('Reset Password Error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
