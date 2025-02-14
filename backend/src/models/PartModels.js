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

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const partMaster = mongoose.model("parts", partSchema);
module.exports = partMaster;
