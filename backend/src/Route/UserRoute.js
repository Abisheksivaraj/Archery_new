const express = require("express");
const router = express.Router();
const User = require("../models/UserModel");
const bcrypt = require("bcryptjs");
const authMiddleware = require("../middleware/auth");
const mongoose = require("mongoose");

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
    console.error("Get users error:", err);
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
    console.error("Get single user error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Create new user
router.post("/create", async (req, res) => {
  try {
    console.log("Received data:", req.body);

    const { name, email, employeeId, role, password, status, permissions } =
      req.body;

    // Validation
    if (!name || !email || !employeeId || !role || !password) {
      return res.status(400).json({
        success: false,
        message: "All required fields must be provided",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters long",
      });
    }

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

    // Handle permissions - now expecting boolean values directly from frontend
    const convertedPermissions = {
      partMaster: Boolean(permissions?.partMaster),
      dispatch: Boolean(permissions?.dispatch),
      scanner: Boolean(permissions?.scanner),
      admin: Boolean(permissions?.admin), // Consistent key name
    };

    console.log("Converted permissions:", convertedPermissions);

    const newUser = new User({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      employeeId,
      role: role.trim(),
      password: hashedPassword,
      status: status || "Active",
      permissions: convertedPermissions,
      createdBy: req.user?.id
        ? new mongoose.Types.ObjectId(req.user.id)
        : new mongoose.Types.ObjectId(),
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

    // Validation for required fields
    if (updateData.name && !updateData.name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Name cannot be empty",
      });
    }

    if (updateData.email && !updateData.email.trim()) {
      return res.status(400).json({
        success: false,
        message: "Email cannot be empty",
      });
    }

    // If password is being updated, validate and hash it
    if (updateData.password) {
      if (updateData.password.length < 6) {
        return res.status(400).json({
          success: false,
          message: "Password must be at least 6 characters long",
        });
      }
      updateData.password = await bcrypt.hash(updateData.password, 10);
    }

    // Handle permissions - now expecting boolean values directly from frontend
    if (updateData.permissions) {
      updateData.permissions = {
        partMaster: Boolean(updateData.permissions.partMaster),
        dispatch: Boolean(updateData.permissions.dispatch),
        scanner: Boolean(updateData.permissions.scanner),
        admin: Boolean(updateData.permissions.admin), // Consistent key name
      };
      console.log("Converted permissions for update:", updateData.permissions);
    }

    // Trim string fields
    if (updateData.name) updateData.name = updateData.name.trim();
    if (updateData.email)
      updateData.email = updateData.email.trim().toLowerCase();
    if (updateData.role) updateData.role = updateData.role.trim();

    let updatedUser;

    // Check if ID is a valid MongoDB ObjectId (24 char hex string)
    if (mongoose.Types.ObjectId.isValid(id) && id.length === 24) {
      // Check for duplicate email/employeeId (excluding current user)
      if (updateData.email || updateData.employeeId) {
        const duplicateQuery = { _id: { $ne: id } };
        if (updateData.email && updateData.employeeId) {
          duplicateQuery.$or = [
            { email: updateData.email },
            { employeeId: updateData.employeeId },
          ];
        } else if (updateData.email) {
          duplicateQuery.email = updateData.email;
        } else if (updateData.employeeId) {
          duplicateQuery.employeeId = updateData.employeeId;
        }

        const duplicate = await User.findOne(duplicateQuery);
        if (duplicate) {
          return res.status(400).json({
            success: false,
            message: "Email or Employee ID already exists",
          });
        }
      }

      // Use findByIdAndUpdate for MongoDB _id
      updatedUser = await User.findByIdAndUpdate(id, updateData, {
        new: true,
        runValidators: true,
      }).select("-password");
    } else {
      // Check for duplicate email/employeeId (excluding current user)
      if (updateData.email || updateData.employeeId) {
        const duplicateQuery = { employeeId: { $ne: id } };
        if (updateData.email && updateData.employeeId) {
          duplicateQuery.$or = [
            { email: updateData.email },
            { employeeId: updateData.employeeId },
          ];
        } else if (updateData.email) {
          duplicateQuery.email = updateData.email;
        } else if (updateData.employeeId) {
          duplicateQuery.employeeId = updateData.employeeId;
        }

        const duplicate = await User.findOne(duplicateQuery);
        if (duplicate) {
          return res.status(400).json({
            success: false,
            message: "Email or Employee ID already exists",
          });
        }
      }

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

// Login route
router.post("/userLogin", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    // Find user by email (case insensitive)
    const user = await User.findOne({
      email: email.trim().toLowerCase(),
    });

    if (!user) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid credentials" });
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid credentials" });
    }

    // Check if user is active
    if (user.status !== "Active") {
      return res
        .status(401)
        .json({ success: false, message: "Account is inactive" });
    }

    // Return user data without password
    res.json({
      success: true,
      message: "Login successful",
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
      token: "dummy-token", // Add proper JWT token generation here if needed
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Admin login route (if different from user login)
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    // Find admin user
    const admin = await User.findOne({
      email: email.trim().toLowerCase(),
      "permissions.admin": true, // Only admin users
    });

    if (!admin) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid admin credentials" });
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, admin.password);
    if (!isPasswordValid) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid admin credentials" });
    }

    // Check if admin is active
    if (admin.status !== "Active") {
      return res
        .status(401)
        .json({ success: false, message: "Admin account is inactive" });
    }

    res.json({
      success: true,
      message: "Admin login successful",
      admin: {
        _id: admin._id,
        name: admin.name,
        email: admin.email,
        employeeId: admin.employeeId,
        role: admin.role,
        status: admin.status,
        permissions: admin.permissions,
      },
      token: "dummy-token", // Add proper JWT token generation here if needed
    });
  } catch (err) {
    console.error("Admin login error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
