// routes/rawScans.js - Simple API routes for raw scan data storage
const express = require("express");
const router = express.Router();
const RawScan = require("../models/MachineModel");

// POST /api/raw-scans - Store raw scan data (NO TRIMMING)
router.post("/", async (req, res) => {
  try {
    const { rawData } = req.body;

    // Validate that rawData exists (allow empty strings, just not null/undefined)
    if (rawData === undefined || rawData === null) {
      return res.status(400).json({
        success: false,
        message: "Raw data is required",
      });
    }

    console.log("Storing raw scan data:", {
      dataLength: rawData.length,
      dataPreview:
        rawData.substring(0, 50) + (rawData.length > 50 ? "..." : ""),
    });

    // Create new raw scan record - store data exactly as received
    const rawScan = new RawScan({
      rawData: rawData, // NO .trim() - store exactly as scanned
    });

    // Save to database
    const savedScan = await rawScan.save();

    console.log("Raw scan data stored successfully:", {
      id: savedScan._id,
      dataLength: savedScan.rawData.length,
      timestamp: savedScan.createdAt,
    });

    res.status(201).json({
      success: true,
      message: "Raw scan data stored successfully",
      data: {
        id: savedScan._id,
        dataLength: savedScan.rawData.length,
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

module.exports = router;
