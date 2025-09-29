// routes/rawScans.js - Simple API routes for raw scan data storage
const express = require("express");
const router = express.Router();
const RawScan = require("../models/MachineModel");

// POST /api/raw-scans - Store raw scan data (NO TRIMMING)
// POST /api/raw-scans - Store raw scan data with serial/part number
router.post("/", async (req, res) => {
  try {
    const { rawData, serialNumber, partNumber, invoiceNumber, sessionId } = req.body;

    if (rawData === undefined || rawData === null) {
      return res.status(400).json({
        success: false,
        message: "Raw data is required",
      });
    }

    console.log("Storing raw scan data:", {
      dataLength: rawData.length,
      serialNumber,
      partNumber,
      invoiceNumber,
    });

    // Create new raw scan record
    const rawScan = new RawScan({
      rawData: rawData,
      serialNumber: serialNumber || null,
      partNumber: partNumber || null,
      invoiceNumber: invoiceNumber || null,
      sessionId: sessionId || null,
    });

    const savedScan = await rawScan.save();

    console.log("Raw scan data stored successfully:", {
      id: savedScan._id,
      serialNumber: savedScan.serialNumber,
      timestamp: savedScan.createdAt,
    });

    res.status(201).json({
      success: true,
      message: "Raw scan data stored successfully",
      data: {
        id: savedScan._id,
        serialNumber: savedScan.serialNumber,
        partNumber: savedScan.partNumber,
        createdAt: savedScan.createdAt,
      },
    });
  } catch (error) {
    console.error("Error storing raw scan data:", error);
    res.status(500).json({
      success: false,
      message: "Failed to store raw scan data",
      error: error.message,
    });
  }
});

// GET /api/raw-scans - Retrieve raw scan data
router.get("/", async (req, res) => {
  try {
    const { limit = 100, page = 1 } = req.query;

    // Execute query with pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const scans = await RawScan.find({})
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip);

    // Get total count for pagination
    const totalCount = await RawScan.countDocuments({});

    res.json({
      success: true,
      data: scans,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalCount,
        pages: Math.ceil(totalCount / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("Error retrieving raw scan data:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve raw scan data",
      error: error.message,
    });
  }
});

// GET /api/raw-scans/:id - Get specific scan by ID
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const scan = await RawScan.findById(id);

    if (!scan) {
      return res.status(404).json({
        success: false,
        message: "Scan not found",
      });
    }

    res.json({
      success: true,
      data: scan,
    });
  } catch (error) {
    console.error("Error retrieving scan:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve scan",
      error: error.message,
    });
  }
});

// DELETE /api/raw-scans/:id - Delete specific scan
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const deletedScan = await RawScan.findByIdAndDelete(id);

    if (!deletedScan) {
      return res.status(404).json({
        success: false,
        message: "Scan not found",
      });
    }

    res.json({
      success: true,
      message: "Scan deleted successfully",
      data: deletedScan,
    });
  } catch (error) {
    console.error("Error deleting scan:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete scan",
      error: error.message,
    });
  }
});


// POST /api/raw-scans/check-duplicate - Check for duplicate serial number
router.post("/check-duplicate", async (req, res) => {
  try {
    const { serialNumber, partNumber, invoiceNumber } = req.body;

    if (!serialNumber || !partNumber) {
      return res.status(400).json({
        success: false,
        message: "Serial number and part number are required",
      });
    }

    console.log("Checking for duplicate:", {
      serialNumber,
      partNumber,
      invoiceNumber,
    });

    // Check if this serial number already exists for this part number
    const existingScan = await RawScan.findOne({
      serialNumber: serialNumber,
      partNumber: partNumber,
    });

    if (existingScan) {
      console.log("DUPLICATE DETECTED:", {
        serialNumber,
        partNumber,
        existingScanId: existingScan._id,
        existingTimestamp: existingScan.createdAt,
        existingInvoice: existingScan.invoiceNumber,
      });

      return res.status(409).json({
        success: false,
        isDuplicate: true,
        message: `Duplicate serial number detected!`,
        data: {
          serialNumber: serialNumber,
          partNumber: partNumber,
          previousScan: {
            id: existingScan._id,
            timestamp: existingScan.createdAt,
            invoiceNumber: existingScan.invoiceNumber,
            sessionId: existingScan.sessionId,
          },
        },
      });
    }

    // No duplicate found
    console.log("No duplicate found - serial number is unique");
    
    return res.json({
      success: true,
      isDuplicate: false,
      message: "Serial number is unique",
    });
  } catch (error) {
    console.error("Error checking duplicate:", error);
    res.status(500).json({
      success: false,
      message: "Failed to check duplicate",
      error: error.message,
    });
  }
});

// GET /api/raw-scans/duplicates - Find all duplicate serial numbers
router.get("/duplicates", async (req, res) => {
  try {
    const duplicates = await RawScan.aggregate([
      {
        $match: {
          serialNumber: { $exists: true, $ne: null },
          partNumber: { $exists: true, $ne: null },
        },
      },
      {
        $group: {
          _id: {
            serialNumber: "$serialNumber",
            partNumber: "$partNumber",
          },
          count: { $sum: 1 },
          scans: { $push: "$$ROOT" },
        },
      },
      {
        $match: {
          count: { $gt: 1 },
        },
      },
      {
        $sort: { count: -1 },
      },
    ]);

    res.json({
      success: true,
      data: duplicates,
      totalDuplicateGroups: duplicates.length,
    });
  } catch (error) {
    console.error("Error finding duplicates:", error);
    res.status(500).json({
      success: false,
      message: "Failed to find duplicates",
      error: error.message,
    });
  }
});

module.exports = router;
