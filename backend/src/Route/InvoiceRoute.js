// src/Route/BarcodeScanRoute.js
const express = require("express");
const router = express.Router();
const BarcodeData = require("../models/InvoiceModel");

// Middleware for error handling
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Function to parse barcode data
const parseBarcodeData = (rawData) => {
  try {
    const parts = rawData.trim().split(/\s+/);

    const parsedData = {
      vendorCode: parts[0] || "",
      poNumber: parts[1] || "",
      invoiceNumber: parts[2] || "",
      date: parts[3] || "",
      field5: parts[4] || "",
      field6: parts[5] || "",
      field7: parts[6] || "",
      vehicleNumber: parts[7] || "",
      field9: parts[8] || "",
      field10: parts[9] || "",
      field11: parts[10] || "",
      partNumber: parts[11] || "",
      field13: parts[12] || "",
      quantity: parts[13] || "",
      field15: parts[14] || "",
      totalParts: parts.length,
      rawData: rawData,
    };

    return parsedData;
  } catch (error) {
    throw new Error("Invalid barcode format");
  }
};

// Validation function - more flexible
const validateBarcodeData = (data) => {
  const errors = [];

  // Only validate the most critical fields
  if (!data.invoiceNumber || data.invoiceNumber.trim() === "") {
    errors.push("Invoice number is required");
  }

  // For other fields, just warn if missing but don't fail validation
  const warnings = [];
  if (!data.vendorCode) warnings.push("Vendor code");
  if (!data.poNumber) warnings.push("PO number");
  if (!data.date) warnings.push("Date");
  if (!data.vehicleNumber) warnings.push("Vehicle number");
  if (!data.partNumber) warnings.push("Part number");
  if (!data.quantity) warnings.push("Quantity");

  return { errors, warnings };
};

// GET /api/scan/data - Get specific fields only
router.get(
  "/data",
  asyncHandler(async (req, res) => {
    const { limit = 100, skip = 0 } = req.query;

    const scanData = await BarcodeData.find({})
      .sort({ scannedAt: -1 })
      .skip(parseInt(skip))
      .limit(parseInt(limit))
      .select(
        "invoiceNumber partNumber vendorCode date vehicleNumber quantity poNumber scannedAt"
      )
      .lean(); // Use lean() for better performance

    // Format the response to only include the requested fields
    const formattedData = scanData.map((item) => ({
      invoiceNumber: item.invoiceNumber || "",
      partNumber: item.partNumber || "",
      vendorCode: item.vendorCode || "",
      date: item.date || "",
      vehicleNumber: item.vehicleNumber || "",
      quantity: item.quantity || "",
      poNumber: item.poNumber || "",
      scannedAt: item.scannedAt,
    }));

    res.json({
      success: true,
      data: formattedData,
      count: formattedData.length,
      message: "Data retrieved successfully",
    });
  })
);

// GET /api/scan/data/search - Search with specific fields only
router.get(
  "/data/search",
  asyncHandler(async (req, res) => {
    const {
      invoiceNumber,
      partNumber,
      vendorCode,
      poNumber,
      vehicleNumber,
      limit = 50,
    } = req.query;

    let searchQuery = {};

    if (invoiceNumber) {
      searchQuery.invoiceNumber = { $regex: invoiceNumber, $options: "i" };
    }
    if (partNumber) {
      searchQuery.partNumber = { $regex: partNumber, $options: "i" };
    }
    if (vendorCode) {
      searchQuery.vendorCode = { $regex: vendorCode, $options: "i" };
    }
    if (poNumber) {
      searchQuery.poNumber = { $regex: poNumber, $options: "i" };
    }
    if (vehicleNumber) {
      searchQuery.vehicleNumber = { $regex: vehicleNumber, $options: "i" };
    }

    const searchResults = await BarcodeData.find(searchQuery)
      .sort({ scannedAt: -1 })
      .limit(parseInt(limit))
      .select(
        "invoiceNumber partNumber vendorCode date vehicleNumber quantity poNumber scannedAt"
      )
      .lean();

    // Format the response
    const formattedResults = searchResults.map((item) => ({
      invoiceNumber: item.invoiceNumber || "",
      partNumber: item.partNumber || "",
      vendorCode: item.vendorCode || "",
      date: item.date || "",
      vehicleNumber: item.vehicleNumber || "",
      quantity: item.quantity || "",
      poNumber: item.poNumber || "",
      scannedAt: item.scannedAt,
    }));

    res.json({
      success: true,
      data: formattedResults,
      count: formattedResults.length,
      searchCriteria: {
        invoiceNumber,
        partNumber,
        vendorCode,
        poNumber,
        vehicleNumber,
      },
    });
  })
);

// POST /api/scan - Main scan route
router.post(
  "/",
  asyncHandler(async (req, res) => {
    console.log("📥 Received request body:", req.body);

    const { barcodeData } = req.body;

    if (!barcodeData) {
      console.log("❌ No barcodeData provided");
      return res.status(400).json({
        success: false,
        message: "Barcode data is required",
      });
    }

    try {
      const parsedData = parseBarcodeData(barcodeData);
      console.log("✅ Parsed data:", parsedData);

      const { errors, warnings } = validateBarcodeData(parsedData);

      if (errors.length > 0) {
        console.log("❌ Validation errors:", errors);
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: errors,
          parsedData: parsedData,
        });
      }

      // Log warnings but don't fail the request
      if (warnings.length > 0) {
        console.log("⚠️ Missing fields:", warnings);
      }

      // Check if invoice number already exists
      const existingRecord = await BarcodeData.findOne({
        invoiceNumber: parsedData.invoiceNumber,
      });

      if (existingRecord) {
        console.log("❌ Duplicate invoice:", parsedData.invoiceNumber);
        return res.status(409).json({
          success: false,
          message: `Invoice number ${parsedData.invoiceNumber} already exists`,
          existingRecord: {
            id: existingRecord._id,
            invoiceNumber: existingRecord.invoiceNumber,
            scannedAt: existingRecord.scannedAt,
            status: existingRecord.status,
          },
        });
      }

      // Create new barcode record
      const newBarcodeData = new BarcodeData({
        ...parsedData,
        status: "scanned",
        scannedAt: new Date(),
      });

      const savedData = await newBarcodeData.save();
      console.log("✅ Saved to database:", savedData._id);

      const responseData = {
        success: true,
        message: "Barcode scanned and data stored successfully",
        data: {
          id: savedData._id,
          invoiceNumber: savedData.invoiceNumber,
          vendorCode: savedData.vendorCode,
          poNumber: savedData.poNumber,
          partNumber: savedData.partNumber,
          quantity: savedData.quantity,
          vehicleNumber: savedData.vehicleNumber,
          date: savedData.date,
          status: savedData.status,
          scannedAt: savedData.scannedAt,
          totalParts: savedData.totalParts,
        },
      };

      // Add warnings to response if any
      if (warnings.length > 0) {
        responseData.warnings = warnings;
        responseData.message += ` (Missing optional fields: ${warnings.join(
          ", "
        )})`;
      }

      res.status(201).json(responseData);
    } catch (error) {
      console.error("❌ Barcode parsing error:", error);

      if (error.message === "Invalid barcode format") {
        return res.status(400).json({
          success: false,
          message: "Invalid barcode format",
          rawData: barcodeData,
          hint: "Please ensure the barcode contains all required fields separated by spaces",
        });
      }

      throw error;
    }
  })
);

// GET /api/scan/recent - Get recent scans for table display
router.get(
  "/recent",
  asyncHandler(async (req, res) => {
    const { limit = 100 } = req.query;

    const recentScans = await BarcodeData.find({})
      .sort({ scannedAt: -1 })
      .limit(parseInt(limit))
      .select(
        "invoiceNumber poNumber partNumber vehicleNumber date quantity status scannedAt"
      );

    res.json({
      success: true,
      data: recentScans,
    });
  })
);

// DELETE /api/scan/:id - Delete specific scan
router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const deletedScan = await BarcodeData.findByIdAndDelete(id);

    if (!deletedScan) {
      return res.status(404).json({
        success: false,
        message: "Scan data not found",
      });
    }

    res.json({
      success: true,
      message: "Scan data deleted successfully",
      data: {
        id: deletedScan._id,
        invoiceNumber: deletedScan.invoiceNumber,
      },
    });
  })
);

// GET /api/scan/search - Search scans by criteria
router.get(
  "/search",
  asyncHandler(async (req, res) => {
    const { invoiceNumber, poNumber, partNumber, vehicleNumber } = req.query;

    let searchQuery = {};

    if (invoiceNumber) {
      searchQuery.invoiceNumber = { $regex: invoiceNumber, $options: "i" };
    }
    if (poNumber) {
      searchQuery.poNumber = { $regex: poNumber, $options: "i" };
    }
    if (partNumber) {
      searchQuery.partNumber = { $regex: partNumber, $options: "i" };
    }
    if (vehicleNumber) {
      searchQuery.vehicleNumber = { $regex: vehicleNumber, $options: "i" };
    }

    const searchResults = await BarcodeData.find(searchQuery)
      .sort({ scannedAt: -1 })
      .limit(50)
      .select(
        "invoiceNumber poNumber partNumber vehicleNumber date quantity status scannedAt"
      );

    res.json({
      success: true,
      data: searchResults,
      count: searchResults.length,
    });
  })
);

// PUT /api/scan/:id/status - Update scan status
router.put(
  "/:id/status",
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ["scanned", "processed", "error"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status. Must be one of: " + validStatuses.join(", "),
      });
    }

    const updatedScan = await BarcodeData.findByIdAndUpdate(
      id,
      {
        status,
        processedAt: status === "processed" ? new Date() : null,
      },
      { new: true }
    );

    if (!updatedScan) {
      return res.status(404).json({
        success: false,
        message: "Scan data not found",
      });
    }

    res.json({
      success: true,
      message: "Status updated successfully",
      data: updatedScan,
    });
  })
);

// Error handling middleware
router.use((error, req, res, next) => {
  console.error("Scan route error:", error);

  if (error.name === "ValidationError") {
    return res.status(400).json({
      success: false,
      message: "Database validation error",
      errors: Object.values(error.errors).map((err) => err.message),
    });
  }

  if (error.code === 11000) {
    return res.status(409).json({
      success: false,
      message: "Duplicate invoice number detected",
      field: Object.keys(error.keyPattern)[0],
    });
  }

  if (error.name === "CastError") {
    return res.status(400).json({
      success: false,
      message: "Invalid ID format",
    });
  }

  res.status(500).json({
    success: false,
    message: "Error processing barcode scan",
    error: process.env.NODE_ENV === "development" ? error.message : undefined,
  });
});

module.exports = router;
