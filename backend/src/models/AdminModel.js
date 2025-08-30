const mongoose = require("mongoose");

const adminSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true, // to prevent duplicate emails
  },
  password: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    default: "admin",
  },
  permissions: {
    partMaster: { type: Boolean, default: true },
    dispatch: { type: Boolean, default: true },
    scanner: { type: Boolean, default: true },
    admin: { type: Boolean, default: true },
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const AdminLogin = mongoose.model("Admin", adminSchema);
module.exports = AdminLogin;
