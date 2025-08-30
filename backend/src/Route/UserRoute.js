const express = require("express");
const router = express.Router();
const User = require("../models/UserModel");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken"); // Add this import
const authMiddleware = require("../middleware/auth");
const mongoose = require("mongoose");

// JWT Secret - should be in environment variables
const JWT_SECRET =
  process.env.JWT_SECRET || "your-secret-key-here-change-in-production";

// Get all users
router.get("/users", authMiddleware, async (req, res) => {
  try {
    const users = await User.find()
      .select("-password")
      .populate("createdBy", "name email");
    res.json({
      success: true,
      message: "Users retrieved successfully",
      users: users,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get single user
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select("-password")
      .populate("createdBy", "name email");
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }
    res.json({
      success: true,
      message: "User retrieved successfully",
      user: user,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Create new user
router.post("/create", async (req, res) => {
  try {
    console.log("Received data:", req.body);

    const { name, email, employeeId, role, password, status, permissions } =
      req.body;

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { employeeId }],
    });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User with this email or employee ID already exists",
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Convert string permissions to boolean
    const convertedPermissions = {
      partMaster: permissions?.partMaster === "Access",
      dispatch: permissions?.dispatch === "Access",
      scanner: permissions?.scanner === "Access",
      admin: permissions?.Admin === "Access", // Note: frontend sends "Admin", backend stores as "admin"
    };

    console.log("Converted permissions:", convertedPermissions);

    const newUser = new User({
      name,
      email,
      employeeId,
      role,
      password: hashedPassword,
      status: status || "Active",
      permissions: convertedPermissions,
      createdBy: new mongoose.Types.ObjectId(),
    });

    await newUser.save();

    // Return user without password
    const userResponse = await User.findById(newUser._id).select("-password");

    res.status(201).json({
      success: true,
      message: "User created successfully",
      user: userResponse,
    });
  } catch (err) {
    console.error("Create user error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Update user - handles both MongoDB _id and employeeId
router.put("/users/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };

    console.log("Update data received:", updateData);
    console.log("ID parameter:", id);

    // If password is being updated, hash it
    if (updateData.password) {
      updateData.password = await bcrypt.hash(updateData.password, 10);
    }

    // Convert string permissions to boolean if permissions are being updated
    if (updateData.permissions) {
      updateData.permissions = {
        partMaster: updateData.permissions.partMaster === "Access",
        dispatch: updateData.permissions.dispatch === "Access",
        scanner: updateData.permissions.scanner === "Access",
        admin: updateData.permissions.Admin === "Access",
      };
      console.log("Converted permissions for update:", updateData.permissions);
    }

    let updatedUser;

    // Check if ID is a valid MongoDB ObjectId (24 char hex string)
    if (mongoose.Types.ObjectId.isValid(id) && id.length === 24) {
      // Use findByIdAndUpdate for MongoDB _id
      updatedUser = await User.findByIdAndUpdate(id, updateData, {
        new: true,
        runValidators: true,
      }).select("-password");
    } else {
      // Use findOneAndUpdate for employeeId
      updatedUser = await User.findOneAndUpdate(
        { employeeId: id },
        updateData,
        {
          new: true,
          runValidators: true,
        }
      ).select("-password");
    }

    if (!updatedUser) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    res.json({
      success: true,
      message: "User updated successfully",
      user: updatedUser,
    });
  } catch (err) {
    console.error("Update user error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Delete user - handles both MongoDB _id and employeeId
router.delete("/users/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    console.log("Delete ID parameter:", id);

    let deletedUser;

    // Check if ID is a valid MongoDB ObjectId (24 char hex string)
    if (mongoose.Types.ObjectId.isValid(id) && id.length === 24) {
      // Use findByIdAndDelete for MongoDB _id
      deletedUser = await User.findByIdAndDelete(id);
    } else {
      // Use findOneAndDelete for employeeId
      deletedUser = await User.findOneAndDelete({ employeeId: id });
    }

    if (!deletedUser) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    res.json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (err) {
    console.error("Delete user error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// FIXED Login route with JWT token generation
router.post("/userLogin", async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log("Login attempt for email:", email);

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      console.log("User not found for email:", email);
      return res
        .status(401)
        .json({ success: false, message: "Invalid credentials" });
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      console.log("Invalid password for user:", email);
      return res
        .status(401)
        .json({ success: false, message: "Invalid credentials" });
    }

    // Check if user is active
    if (user.status !== "Active") {
      console.log("Inactive user login attempt:", email);
      return res
        .status(401)
        .json({ success: false, message: "Account is inactive" });
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: user._id,
        email: user.email,
        role: user.role,
      },
      JWT_SECRET,
      { expiresIn: "24h" } // Token expires in 24 hours
    );

    console.log("Login successful for user:", email);

    // Return success response with token and user data
    res.json({
      success: true,
      message: "Login successful",
      token: token, // This is what the frontend expects
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        employeeId: user.employeeId,
        department: user.department,
        role: user.role,
        status: user.status,
        permissions: user.permissions,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
