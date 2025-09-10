// models/Operator.js
const mongoose = require("mongoose");

const operatorSchema = new mongoose.Schema(
  {
    operatorId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    role: {
      type: String,
      default: "operator",
      enum: ["operator"],
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

module.exports = mongoose.model("Operator", operatorSchema);
