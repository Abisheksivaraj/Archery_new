// 2. Updated OperatorRoute.js with proper JWT_SECRET handling
const express = require("express");
const jwt = require("jsonwebtoken");
const Operator = require("../models/Operator.js");

const router = express.Router();

// Get JWT secret with fallback for development
const getJWTSecret = () => {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    console.warn("⚠️  JWT_SECRET not found in environment variables!");
    // For development only - use a temporary secret
    const devSecret = "temp-dev-secret-key-change-in-production";
    console.warn(
      "⚠️  Using temporary development secret. Set JWT_SECRET in .env file!"
    );
    return devSecret;
  }

  return secret;
};

// Operator login
router.post("/operatorLogin", async (req, res) => {
  try {
    const { operatorId } = req.body;

    if (!operatorId) {
      return res.status(400).json({ message: "Operator ID is required" });
    }

    // Validate operator ID format (Letter + 5 digits)
    if (!/^[A-Z][0-9]{5}$/.test(operatorId)) {
      return res.status(400).json({
        message: "Invalid operator ID format. Use format like: N95421",
      });
    }

    const operator = await Operator.findOne({ operatorId });
    if (!operator) {
      return res.status(401).json({ message: "Invalid Operator ID" });
    }

    // Generate JWT with proper secret handling
    const token = jwt.sign(
      { id: operator._id, role: operator.role },
      getJWTSecret(),
      { expiresIn: "1d" }
    );

    res.json({
      message: "Operator login successful",
      operator: {
        operatorId: operator.operatorId,
        role: operator.role,
        createdAt: operator.createdAt,
      },
      token,
    });
  } catch (error) {
    console.error("Operator login error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Create new operator
router.post("/createOperator", async (req, res) => {
  try {
    const { operatorId } = req.body;

    if (!operatorId) {
      return res.status(400).json({ message: "Operator ID is required" });
    }

    // Validate operator ID format (Letter + 5 digits)
    if (!/^[A-Z][0-9]{5}$/.test(operatorId)) {
      return res.status(400).json({
        message: "Invalid operator ID format. Use format like: N95421",
      });
    }

    // Check if operator already exists
    const existingOperator = await Operator.findOne({ operatorId });
    if (existingOperator) {
      // If operator exists, return login response
      const token = jwt.sign(
        { id: existingOperator._id, role: existingOperator.role },
        getJWTSecret(),
        { expiresIn: "1d" }
      );

      return res.json({
        message: "Operator already exists - logged in",
        operator: {
          operatorId: existingOperator.operatorId,
          role: existingOperator.role,
          createdAt: existingOperator.createdAt,
        },
        token,
      });
    }

    // Create new operator
    const newOperator = new Operator({
      operatorId,
      role: "operator",
      status: "active",
    });

    await newOperator.save();

    // Generate JWT for the new operator with proper secret handling
    const token = jwt.sign(
      { id: newOperator._id, role: newOperator.role },
      getJWTSecret(),
      { expiresIn: "1d" }
    );

    res.status(201).json({
      message: "Operator created successfully",
      operator: {
        operatorId: newOperator.operatorId,
        role: newOperator.role,
        createdAt: newOperator.createdAt,
      },
      token,
    });

    console.log(`✅ New operator auto-created: ${operatorId}`);
  } catch (error) {
    console.error("Auto-create operator error:", error);
    res.status(500).json({ message: "Server error during operator creation" });
  }
});

module.exports = router;
