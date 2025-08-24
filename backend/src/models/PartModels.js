const mongoose = require("mongoose");

const partSchema = new mongoose.Schema({
  partNo: {
    type: String,
    required: true,
    unique: true,
  },
  description: {
    type: String,
    required: true,
  },
  binQuantity: {
    type: Number,
    required: true,
    min: 0,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const partMaster = mongoose.model("parts", partSchema);
module.exports = partMaster;
