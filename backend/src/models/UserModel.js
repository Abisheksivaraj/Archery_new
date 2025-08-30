const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    employeeId: { type: String, required: true, unique: true },

    role: {
      type: String,
      required: true,
    },
    password: { type: String, required: true },

    // Instead of Boolean, use enum for status
    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active",
    },

    // Permissions
    permissions: {
      partMaster: { type: Boolean, default: false },
      dispatch: { type: Boolean, default: false },
      scanner: { type: Boolean, default: false },
      admin: { type: Boolean, default: false },
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      required: false,
    },
  },
  { timestamps: true }
);

// Index for better performance
userSchema.index({ email: 1 });
userSchema.index({ employeeId: 1 });

module.exports = mongoose.model("User", userSchema);
