const mongoose = require("mongoose");

const productionSchema = new mongoose.Schema({
  pkg_No: {
    type: String,
    required: true,
  },
  partNo: {
    type: String,
    required: true,
  },
  partName: {
    type: String,
    required: true,
  },
  productionQuantity: {
    type: Number,
    required: true,
  },
  scannedQuantity: {
    type: Number,
    required: true,
  },
  packageCount: {
    type: Number,
    default: 0,
  },
  timestamp: {
    type: Date,
    required: true,
  },
  date: {
    type: String, 
    required: true,
  },
  day: {
    type: String, 
    required: true,
  },
  time: {
    type: String,
    required: true,
  },
});

module.exports = mongoose.model("Production", productionSchema);
