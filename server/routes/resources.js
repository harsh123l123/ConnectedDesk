const express = require('express');
const verify = require('../middleware/auth');
const Resource = require('../models/Resource');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// Ensure upload directory exists
const uploadDir = 'uploads/resources';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer Config
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir)
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, uniqueSuffix + '-' + file.originalname)
  }
});
const upload = multer({ storage: storage });

// Create Resource
router.post('/', verify, upload.single('file'), async (req, res) => {
  try {
    const { title, description, folder, tags } = req.body;
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    const fileUrl = req.file.path.replace(/\\/g, "/");
    const fileType = req.file.mimetype;

    // Parse tags if they come as a JSON string
    let parsedTags = [];
    if (tags) {
      try {
        parsedTags = typeof tags === 'string' ? JSON.parse(tags) : tags;
      } catch (e) {
        parsedTags = tags.split(',').map(t => t.trim());
      }
    }

    const resource = await Resource.create({
      title,
      description,
      fileUrl,
      fileType,
      folder: folder || 'root',
      tags: parsedTags,
      uploadedBy: req.user._id
    });

    const fullResource = await Resource.findById(resource._id).populate("uploadedBy", "-password");
    res.status(201).json(fullResource);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Get All Resources
router.get('/', verify, async (req, res) => {
  try {
    const resources = await Resource.find()
      .populate("uploadedBy", "username avatar")
      .sort({ createdAt: -1 });
    res.json(resources);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete Resource
router.delete('/:id', verify, async (req, res) => {
  try {
    const resource = await Resource.findById(req.params.id);
    if (!resource) return res.status(404).json({ message: "Resource not found" });

    if (resource.uploadedBy.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: "Not authorized" });
    }

    // Remove file
    fs.unlink(resource.fileUrl, (err) => {
      if (err) console.error(err);
    });

    await resource.deleteOne(); // or deleteOne() if mongoose > 7
    res.json({ message: "Resource removed" });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;
