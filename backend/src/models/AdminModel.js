const mongoose = require("mongoose");

const adminSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    default: "Admin",
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const adminLogin = mongoose.model("admin", adminSchema);
module.exports = adminLogin;
