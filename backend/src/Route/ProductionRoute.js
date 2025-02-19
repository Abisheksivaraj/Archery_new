// In your routes file (e.g., productionRoutes.js)
const express = require("express");
const route = express.Router();
const Production = require("../models/ProductionTracking");

// Route to save package and update counts
route.post("/savePackage", async (req, res) => {
  try {
    const { partNo, partName, productionQuantity, scannedQuantity } = req.body;

    if (!partNo || !partName || !productionQuantity) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    // Find the latest package number to generate a new one
    const latestProduction = await Production.findOne().sort({ pkg_No: -1 });

    let newPkgNo;
    if (
      latestProduction &&
      latestProduction.pkg_No &&
      latestProduction.pkg_No.startsWith("ATPL-")
    ) {
      // Extract the number part and increment
      const lastNumberStr = latestProduction.pkg_No.split("-")[1];
      const lastNumber = parseInt(lastNumberStr);
      const newNumber = lastNumber + 1;
      // Pad with zeros to maintain format (e.g., 001, 002, etc.)
      newPkgNo = `ATPL-${newNumber.toString().padStart(3, "0")}`;
    } else {
      // If no previous package or invalid format, start with 001
      newPkgNo = "ATPL-001";
    }

    // Check if an entry for this partNo already exists
    const existingProduction = await Production.findOne({ partNo });

    if (existingProduction) {
      // Update existing entry
      existingProduction.scannedQuantity += scannedQuantity;
      existingProduction.packageCount += 1;
      existingProduction.timestamp = new Date();

      await existingProduction.save();

      return res.status(200).json({
        success: true,
        message: "Package count updated successfully",
        data: existingProduction,
        newPkgNo,
      });
    } else {
      // Create new entry
      const newProduction = new Production({
        pkg_No: newPkgNo,
        partNo,
        partName,
        productionQuantity,
        scannedQuantity,
        packageCount: 1,
        timestamp: new Date(),
      });

      await newProduction.save();

      return res.status(201).json({
        success: true,
        message: "New package saved successfully",
        data: newProduction,
      });
    }
  } catch (error) {
    console.error("Error saving package:", error);
    return res.status(500).json({
      success: false,
      message: "Error saving package",
      error: error.message,
    });
  }
});


route.get("/getAllProduction", async (req, res) => {
  try {
    const productions = await Production.find().sort({ timestamp: -1 });
    return res.status(200).json({
      success: true,
      count: productions.length,
      data: productions,
    });
  } catch (error) {
    console.error("Error fetching production data:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching production data",
      error: error.message,
    });
  }
});

route.get("/getPackageCount/:partNo", async (req, res) => {
  try {
    const { partNo } = req.params;
    const production = await Production.findOne(
      { partNo },
      { packageCount: 1 }
    );

    if (!production) {
      return res.status(404).json({
        success: false,
        message: "No production data found for this part number",
      });
    }

    return res.status(200).json({
      success: true,
      packageCount: production.packageCount || 0,
    });
  } catch (error) {
    console.error("Error fetching package count:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching package count",
      error: error.message,
    });
  }
});

module.exports = route;
