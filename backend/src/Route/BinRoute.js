const express = require("express");
const router = express.Router();
// Import the enhanced models
const { BinData, ScanEvent, Package } = require("../models/BinModel");

// Updated helper function to parse QR code data for your specific format
const parseQRCodeData = (qrCodeText) => {
  try {
    console.log("Backend parsing QR Code:", qrCodeText);

    // Clean the input - remove extra whitespace but preserve structure
    const cleanedText = qrCodeText.trim();

    // Extract bin number (first 13 digits)
    const binNoMatch = cleanedText.match(/^(\d{13})/);
    if (!binNoMatch) {
      throw new Error(
        "Could not find bin number (expected 13 digits at start)"
      );
    }
    const binNo = binNoMatch[1];

    // Remove bin number and clean remaining text
    let remainingText = cleanedText.substring(13).trim();

    // Extract part number (next 11 characters, may include letters/numbers)
    // Looking for pattern after bin number, accounting for spaces
    const partNoMatch = remainingText.match(/^[\s]*([A-Z0-9]{11})/);
    if (!partNoMatch) {
      throw new Error(
        "Could not find part number (expected 11 characters after bin number)"
      );
    }
    const partNumber = partNoMatch[1];

    // Remove part number and clean
    remainingText = remainingText.substring(partNoMatch[0].length).trim();

    // Extract quantity (should be next digits)
    const quantityMatch = remainingText.match(/^(\d+)/);
    if (!quantityMatch) {
      throw new Error("Could not find quantity");
    }
    const quantity = parseInt(quantityMatch[1]);

    // Remove quantity and clean
    remainingText = remainingText.substring(quantityMatch[0].length).trim();

    // Extract description/part name (everything up to the bin number repeat or date)
    // Look for the pattern where bin number repeats or date appears
    let descriptionOrPartName = "";

    // Try to find where the description ends (usually before bin number repeats or date)
    const binRepeatIndex = remainingText.indexOf(binNo);
    const datePattern = /\d{2}\/\d{2}\/\d{2}/;
    const dateMatch = remainingText.match(datePattern);

    let endIndex = remainingText.length;

    if (binRepeatIndex > 0) {
      endIndex = Math.min(endIndex, binRepeatIndex);
    }
    if (dateMatch && dateMatch.index > 0) {
      endIndex = Math.min(endIndex, dateMatch.index);
    }

    descriptionOrPartName = remainingText.substring(0, endIndex).trim();

    // Clean up description - remove trailing commas, extra spaces
    descriptionOrPartName = descriptionOrPartName.replace(/,$/, "").trim();

    if (!descriptionOrPartName) {
      throw new Error("Could not find description/part name");
    }

    // Extract additional metadata from remaining text
    remainingText = remainingText.substring(endIndex);

    // Extract date
    let date = "";
    const allDateMatches = remainingText.match(/\d{2}\/\d{2}\/\d{2}/g);
    if (allDateMatches && allDateMatches.length > 0) {
      date = allDateMatches[0];
    }

    // Extract invoice-like numbers (long alphanumeric sequences)
    const invoicePattern = /[A-Z0-9]{10,}/g;
    const invoiceMatches = remainingText.match(invoicePattern);
    let invoiceNumber = "";

    if (invoiceMatches) {
      // Get the longest match as it's likely the invoice number
      invoiceNumber = invoiceMatches.reduce(
        (longest, current) =>
          current.length > longest.length ? current : longest,
        ""
      );
    }

    // Validate parsed data
    if (!binNo || binNo.length !== 13) {
      throw new Error(`Invalid bin number: ${binNo}`);
    }
    if (!partNumber || partNumber.length !== 11) {
      throw new Error(`Invalid part number: ${partNumber}`);
    }
    if (isNaN(quantity) || quantity <= 0) {
      throw new Error(`Invalid quantity: ${quantity}`);
    }
    if (!descriptionOrPartName) {
      throw new Error("Description/Part name is empty");
    }

    const result = {
      binNo,
      partNumber,
      quantity,
      descriptionOrPartName,
      date: date || new Date().toLocaleDateString("en-GB"),
      invoiceNumber: invoiceNumber || "UNKNOWN",
      rawQRData: qrCodeText,
    };

    console.log("Backend parsed QR Data:", result);
    return result;
  } catch (error) {
    console.error("Primary QR Parsing Error:", error);

    // Try alternative parsing method
    try {
      console.log("Trying alternative parsing method...");
      return parseQRCodeDataAlternative(qrCodeText);
    } catch (altError) {
      console.error("Alternative QR Parsing Error:", altError);
      throw new Error(`Failed to parse QR code: ${error.message}`);
    }
  }
};

// Alternative parsing approach
const parseQRCodeDataAlternative = (qrCodeText) => {
  try {
    console.log("Alternative parsing for QR Code:", qrCodeText);

    // Split by significant whitespace gaps (multiple spaces)
    const segments = qrCodeText.trim().split(/\s{2,}/);

    if (segments.length < 4) {
      throw new Error("Insufficient data segments in QR code");
    }

    // First segment should contain bin number (13 digits)
    const binNoMatch = segments[0].match(/(\d{13})/);
    if (!binNoMatch) {
      throw new Error("Could not find bin number in first segment");
    }
    const binNo = binNoMatch[1];

    // Second segment should be part number (11 characters)
    const partNumber = segments[1].trim();
    if (partNumber.length !== 11) {
      throw new Error(
        `Part number length mismatch: expected 11, got ${partNumber.length}`
      );
    }

    // Third segment should be quantity
    const quantity = parseInt(segments[2].trim());
    if (isNaN(quantity)) {
      throw new Error(`Invalid quantity: ${segments[2]}`);
    }

    // Fourth segment starts with description
    let descriptionOrPartName = segments[3];

    // Clean up description
    descriptionOrPartName = descriptionOrPartName.replace(/[,\s]+$/, "").trim();

    // Extract additional info from remaining segments
    const remainingText = segments.slice(4).join(" ");

    // Extract date
    const dateMatch = remainingText.match(/\d{2}\/\d{2}\/\d{2}/);
    const date = dateMatch
      ? dateMatch[0]
      : new Date().toLocaleDateString("en-GB");

    // Extract invoice number
    const invoiceMatches = remainingText.match(/[A-Z0-9]{10,}/g);
    const invoiceNumber = invoiceMatches
      ? invoiceMatches.reduce(
          (longest, current) =>
            current.length > longest.length ? current : longest,
          ""
        )
      : "UNKNOWN";

    const result = {
      binNo,
      partNumber,
      quantity,
      descriptionOrPartName,
      date,
      invoiceNumber,
      rawQRData: qrCodeText,
    };

    console.log("Alternative parsed QR Data:", result);
    return result;
  } catch (error) {
    console.error("Alternative QR Parsing Error:", error);
    throw new Error(`Failed to parse QR code (alternative): ${error.message}`);
  }
};

// Route to store bin data from QR code (POST)
router.post("/bindata/qr", async (req, res) => {
  try {
    const { qrCodeData } = req.body;

    if (!qrCodeData) {
      return res.status(400).json({
        success: false,
        message: "QR code data is required",
      });
    }

    // Parse the QR code data
    const parsedData = parseQRCodeData(qrCodeData);

    // Validate required fields
    if (!parsedData.binNo || !parsedData.partNumber || !parsedData.quantity) {
      return res.status(400).json({
        success: false,
        message: "Invalid QR code format - missing required fields",
        parsedData: parsedData,
      });
    }

    // Check if bin already exists
    const existingBin = await BinData.findOne({ binNo: parsedData.binNo });
    if (existingBin) {
      return res.status(409).json({
        success: false,
        message: "Bin number already exists",
        data: existingBin,
      });
    }

    // Create new bin data entry
    const newBinData = new BinData({
      binNo: parsedData.binNo,
      invoiceNumber: parsedData.invoiceNumber,
      date: parsedData.date,
      partNumber: parsedData.partNumber,
      quantity: parsedData.quantity,
      descriptionOrPartName: parsedData.descriptionOrPartName,
      rawQRData: parsedData.rawQRData,
    });

    // Save to database
    const savedBinData = await newBinData.save();

    res.status(201).json({
      success: true,
      message: "Bin data created successfully from QR code",
      data: savedBinData,
      parsedData: parsedData,
    });
  } catch (error) {
    console.error("QR processing error:", error);

    // Handle duplicate bin number error
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Duplicate entry detected",
      });
    }

    // Handle validation errors
    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors: Object.values(error.errors).map((e) => e.message),
      });
    }

    // Handle parsing errors
    if (error.message.includes("Failed to parse QR code")) {
      return res.status(400).json({
        success: false,
        message: error.message,
        originalData: req.body.qrCodeData,
      });
    }

    // Handle other errors
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
});

// Route to get bin data by bin number (GET)
router.get("/bindata/bin/:binNo", async (req, res) => {
  try {
    const { binNo } = req.params;

    const binData = await BinData.findOne({ binNo });

    if (!binData) {
      return res.status(404).json({
        success: false,
        message: "Bin data not found with this bin number",
      });
    }

    res.status(200).json({
      success: true,
      message: "Bin data retrieved successfully",
      data: binData,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
});

// Route to update scan progress with enhanced tracking (POST)
router.post("/bindata/scan-progress", async (req, res) => {
  try {
    const { binNo, scannedQuantity, scannedBy, isValid, mismatchReason } =
      req.body;

    if (!binNo || scannedQuantity === undefined) {
      return res.status(400).json({
        success: false,
        message: "Bin number and scanned quantity are required",
      });
    }

    const binData = await BinData.findOne({ binNo });

    if (!binData) {
      return res.status(404).json({
        success: false,
        message: "Bin data not found",
      });
    }

    // Update scan progress with enhanced tracking
    await binData.updateScanProgress(scannedQuantity, {
      scannedBy: scannedBy || "system",
      isValid: isValid !== false,
      mismatchReason: mismatchReason,
    });

    res.status(200).json({
      success: true,
      message: "Scan progress updated successfully",
      data: binData,
      isCompleted: binData.status === "completed",
      completionPercentage: binData.completionPercentage,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
});

// Route to create package when bin is completed (POST)
router.post("/bindata/create-package", async (req, res) => {
  try {
    const { binNo } = req.body;

    if (!binNo) {
      return res.status(400).json({
        success: false,
        message: "Bin number is required",
      });
    }

    const binData = await BinData.findOne({ binNo });

    if (!binData) {
      return res.status(404).json({
        success: false,
        message: "Bin data not found",
      });
    }

    if (binData.status !== "completed") {
      return res.status(400).json({
        success: false,
        message: "Bin is not completed yet",
      });
    }

    // Check if package already exists for this bin
    const existingPackage = await Package.findOne({ binNo });
    if (existingPackage) {
      return res.status(409).json({
        success: false,
        message: "Package already exists for this bin",
        data: existingPackage,
      });
    }

    // Generate package number
    const packageNo = `PKG-${Date.now().toString().slice(-8)}`;

    // Create new package
    const newPackage = new Package({
      packageNo,
      binNo: binData.binNo,
      invoiceNumber: binData.invoiceNumber,
      partNumber: binData.partNumber,
      quantity: binData.quantity,
    });

    const savedPackage = await newPackage.save();

    res.status(201).json({
      success: true,
      message: "Package created successfully",
      data: savedPackage,
      packageNo: packageNo,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Package already exists",
      });
    }

    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
});

// Route to get scan history for a bin (GET)
router.get("/bindata/scan-history/:binNo", async (req, res) => {
  try {
    const { binNo } = req.params;

    const scanHistory = await BinData.getScanHistory(binNo);

    res.status(200).json({
      success: true,
      message: "Scan history retrieved successfully",
      data: scanHistory,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
});

// Route to get productivity metrics (GET)
router.get("/bindata/productivity-metrics", async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const metrics = await BinData.getProductivityMetrics({
      startDate,
      endDate,
    });

    res.status(200).json({
      success: true,
      message: "Productivity metrics retrieved successfully",
      data: metrics,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
});

// Route to update package status (PUT)
router.put("/packages/:packageNo/status", async (req, res) => {
  try {
    const { packageNo } = req.params;
    const { status, trackingNumber } = req.body;

    const validStatuses = ["created", "printed", "shipped", "delivered"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status",
      });
    }

    const updateData = { status };
    if (trackingNumber) {
      updateData.trackingNumber = trackingNumber;
    }

    const updatedPackage = await Package.findOneAndUpdate(
      { packageNo },
      updateData,
      { new: true, runValidators: true }
    );

    if (!updatedPackage) {
      return res.status(404).json({
        success: false,
        message: "Package not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Package status updated successfully",
      data: updatedPackage,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
});

// Route to get all packages (GET)
router.get("/packages", async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      binNo,
      invoiceNumber,
      partNumber,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    // Build filter object
    const filter = {};
    if (status) filter.status = status;
    if (binNo) filter.binNo = { $regex: binNo, $options: "i" };
    if (invoiceNumber)
      filter.invoiceNumber = { $regex: invoiceNumber, $options: "i" };
    if (partNumber) filter.partNumber = { $regex: partNumber, $options: "i" };

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === "asc" ? 1 : -1;

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get data with pagination and filtering
    const packages = await Package.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count for pagination
    const totalCount = await Package.countDocuments(filter);
    const totalPages = Math.ceil(totalCount / parseInt(limit));

    res.status(200).json({
      success: true,
      message: "Packages retrieved successfully",
      data: packages,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalCount,
        hasNextPage: parseInt(page) < totalPages,
        hasPrevPage: parseInt(page) > 1,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
});

// Keep all existing routes for backward compatibility
router.post("/bindata", async (req, res) => {
  try {
    const {
      binNo,
      invoiceNumber,
      date,
      partNumber,
      quantity,
      descriptionOrPartName,
    } = req.body;

    if (
      !binNo ||
      !invoiceNumber ||
      !date ||
      !partNumber ||
      !quantity ||
      !descriptionOrPartName
    ) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    const newBinData = new BinData({
      binNo,
      invoiceNumber,
      date,
      partNumber,
      quantity,
      descriptionOrPartName,
    });

    const savedBinData = await newBinData.save();

    res.status(201).json({
      success: true,
      message: "Bin data created successfully",
      data: savedBinData,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Bin number already exists",
      });
    }

    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors: Object.values(error.errors).map((e) => e.message),
      });
    }

    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
});

router.get("/bindata", async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      binNo,
      invoiceNumber,
      partNumber,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    const filter = {};
    if (binNo) filter.binNo = { $regex: binNo, $options: "i" };
    if (invoiceNumber)
      filter.invoiceNumber = { $regex: invoiceNumber, $options: "i" };
    if (partNumber) filter.partNumber = { $regex: partNumber, $options: "i" };

    const sort = {};
    sort[sortBy] = sortOrder === "asc" ? 1 : -1;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const binData = await BinData.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    const totalCount = await BinData.countDocuments(filter);
    const totalPages = Math.ceil(totalCount / parseInt(limit));

    res.status(200).json({
      success: true,
      message: "Bin data retrieved successfully",
      data: binData,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalCount,
        hasNextPage: parseInt(page) < totalPages,
        hasPrevPage: parseInt(page) > 1,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
});

router.get("/bindata/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const binData = await BinData.findById(id);

    if (!binData) {
      return res.status(404).json({
        success: false,
        message: "Bin data not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Bin data retrieved successfully",
      data: binData,
    });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid ID format",
      });
    }

    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
});

router.get("/bindata/invoice/:invoiceNumber", async (req, res) => {
  try {
    const { invoiceNumber } = req.params;
    const binData = await BinData.findOne({ invoiceNumber });

    if (!binData) {
      return res.status(404).json({
        success: false,
        message: "Bin data not found with this invoice number",
      });
    }

    res.status(200).json({
      success: true,
      message: "Bin data retrieved successfully",
      data: binData,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
});

router.put("/bindata/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const updatedBinData = await BinData.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!updatedBinData) {
      return res.status(404).json({
        success: false,
        message: "Bin data not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Bin data updated successfully",
      data: updatedBinData,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Bin number already exists",
      });
    }

    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors: Object.values(error.errors).map((e) => e.message),
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
      message: "Internal server error",
      error: error.message,
    });
  }
});

router.delete("/bindata/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const deletedBinData = await BinData.findByIdAndDelete(id);

    if (!deletedBinData) {
      return res.status(404).json({
        success: false,
        message: "Bin data not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Bin data deleted successfully",
      data: deletedBinData,
    });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid ID format",
      });
    }

    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
});

module.exports = router;
