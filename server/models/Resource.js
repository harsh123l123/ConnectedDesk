const mongoose = require('mongoose');

const resourceSchema = mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  fileUrl: { type: String, required: true },
  fileType: { type: String }, // e.g., 'pdf', 'image', 'doc'
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  tags: [{ type: String }],
  folder: { type: String, default: 'root' },
}, { timestamps: true });

const Resource = mongoose.model("Resource", resourceSchema);
module.exports = Resource;
