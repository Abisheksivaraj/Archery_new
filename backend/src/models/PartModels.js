const mongoose = require("mongoose");

const partSchema = new mongoose.Schema({
  partName: {
    type: String,
    required: true,
  },
  partNo: {
    type: String,
    required: true,
  },
  quantity: {
    type: String,
    required: true,
  },
  labelSize: {
    type: String,
    required: true,
    enum: ["4 inch", "6 inch"],
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const partMaster = mongoose.model("parts", partSchema);
module.exports = partMaster;
