const express = require("express");
const route = express.Router();
const Production = require("../models/ProductionTracking");

route.post("/savePackage", async (req, res) => {
  try {
    const { partNo, partName, productionQuantity, scannedQuantity } = req.body;

    if (!partNo || !partName || !productionQuantity) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    const now = new Date();
    const date = now.toISOString().split("T")[0];
    const day = now.toLocaleDateString("en-US", { weekday: "long" });
    const time = now.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
    const latestProduction = await Production.findOne().sort({ pkg_No: -1 });

    let newPkgNo;
    if (
      latestProduction &&
      latestProduction.pkg_No &&
      latestProduction.pkg_No.startsWith("ATPL-")
    ) {
      const lastNumberStr = latestProduction.pkg_No.split("-")[1];
      const lastNumber = parseInt(lastNumberStr);
      const newNumber = lastNumber + 1;
      newPkgNo = `ATPL-${newNumber.toString().padStart(3, "0")}`;
    } else {
      newPkgNo = "ATPL-001";
    }

    const existingProduction = await Production.findOne({ partNo });

    if (existingProduction) {
      existingProduction.scannedQuantity += scannedQuantity;
      existingProduction.packageCount += 1;
      existingProduction.timestamp = now;
      existingProduction.date = date;
      existingProduction.day = day;
      existingProduction.time = time;

      await existingProduction.save();

      return res.status(200).json({
        success: true,
        message: "Package count updated successfully",
        data: existingProduction,
        newPkgNo,
      });
    } else {
      const newProduction = new Production({
        pkg_No: newPkgNo,
        partNo,
        partName,
        productionQuantity,
        scannedQuantity,
        packageCount: 1,
        timestamp: now,
        date,
        day,
        time,
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

route.get("/allDateandDay", async (req, res) => {
  try {
    const aggregatedData = await Production.aggregate([
      {
        $group: {
          _id: { date: "$date", day: "$day" },
          totalPackageCount: { $sum: "$packageCount" },
        },
      },
      {
        $project: {
          _id: 0,
          date: "$_id.date",
          day: "$_id.day",
          packageCount: "$totalPackageCount",
        },
      },
      { $sort: { date: 1 } },
    ]);

    if (!aggregatedData.length) {
      return res.status(404).json({
        success: false,
        message: "No packages found",
      });
    }

    return res.status(200).json({
      success: true,
      data: aggregatedData,
    });
  } catch (error) {
    console.error("Error fetching data:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching data",
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
