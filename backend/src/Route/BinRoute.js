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

    // Replace the invoice number extraction section in your backend parseQRCodeData function
    // Around line 90-110 in your backend route file

    // UPDATED: Extract invoice number - first 10 characters after date
    let invoiceNumber = "";

    if (date) {
      // Find the position of the date in the remaining text
      const dateIndex = remainingText.indexOf(date);
      if (dateIndex !== -1) {
        // Get text after the date
        const afterDate = remainingText.substring(dateIndex + date.length);

        // Remove any spaces and extract first 10 alphanumeric characters
        const cleanAfterDate = afterDate.replace(/\s/g, "");

        if (cleanAfterDate.length >= 10) {
          // Extract exactly 10 characters (letters and numbers) after the date
          invoiceNumber = cleanAfterDate.substring(0, 10);
          console.log(
            "Backend extracted 10-character invoice number after date:",
            invoiceNumber
          );
        } else {
          // If less than 10 characters available, try pattern matching
          const invoiceMatch = cleanAfterDate.match(/^([A-Z0-9]{1,10})/);
          if (invoiceMatch) {
            invoiceNumber = invoiceMatch[1];
            console.log(
              "Backend extracted partial invoice number:",
              invoiceNumber
            );
          }
        }
      }
    }

    // Alternative approach: Look for the pattern in the entire remaining text
    if (!invoiceNumber) {
      // Look for pattern: date (6 digits) followed immediately by 10 alphanumeric characters
      const fullPatternMatch = remainingText.match(
        /\d{2}\/\d{2}\/\d{2}\s*([A-Z0-9]{10})/
      );
      if (fullPatternMatch) {
        invoiceNumber = fullPatternMatch[1];
        console.log(
          "Backend extracted invoice number using full pattern:",
          invoiceNumber
        );
      }
    }

    // If no invoice number found using the specific pattern, use fallback
    if (!invoiceNumber) {
      invoiceNumber = "UNKNOWN";
      console.log(
        "Backend: No invoice found using date pattern, using fallback:",
        invoiceNumber
      );
    }

    // And also update the parseQRCodeDataAlternative function's invoice extraction:

    // UPDATED: Extract invoice number - first 10 characters after date
 

    if (dateMatch) {
      // Find the position of the date in the remaining text
      const dateIndex = remainingText.indexOf(dateMatch[0]);
      if (dateIndex !== -1) {
        // Get text after the date
        const afterDate = remainingText.substring(
          dateIndex + dateMatch[0].length
        );

        // Remove any spaces and extract first 10 alphanumeric characters
        const cleanAfterDate = afterDate.replace(/\s/g, "");

        if (cleanAfterDate.length >= 10) {
          invoiceNumber = cleanAfterDate.substring(0, 10);
          console.log(
            "Alternative method extracted 10-character invoice:",
            invoiceNumber
          );
        }
      }
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
      invoiceNumber, // Now contains exactly 10 characters after date
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

// Updated alternative parsing approach
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

    // UPDATED: Extract invoice number - first 10 characters after date
    let invoiceNumber = "UNKNOWN";
    
    if (dateMatch) {
      // Find the position of the date in the remaining text
      const dateIndex = remainingText.indexOf(dateMatch[0]);
      if (dateIndex !== -1) {
        // Get text after the date
        const afterDate = remainingText.substring(dateIndex + dateMatch[0].length);
        
        // Remove any spaces and extract first 10 alphanumeric characters
        const cleanAfterDate = afterDate.replace(/\s/g, "");
        
        if (cleanAfterDate.length >= 10) {
          invoiceNumber = cleanAfterDate.substring(0, 10);
          console.log("Alternative method extracted 10-character invoice:", invoiceNumber);
        }
      }
    }

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
    throw new Error(
      `Failed to parse QR code (alternative): ${error.message}`
    );
  }
};



// Route to store bin data from QR code (POST)
// router.post("/bindata/qr", async (req, res) => {
//   try {
//     const { qrCodeData } = req.body;

//     if (!qrCodeData) {
//       return res.status(400).json({
//         success: false,
//         message: "QR code data is required",
//       });
//     }

//     // Parse the QR code data
//     const parsedData = parseQRCodeData(qrCodeData);

//     // Validate required fields
//     if (!parsedData.binNo || !parsedData.partNumber || !parsedData.quantity) {
//       return res.status(400).json({
//         success: false,
//         message: "Invalid QR code format - missing required fields",
//         parsedData: parsedData,
//       });
//     }

//     // Check if bin already exists
//     const existingBin = await BinData.findOne({ binNo: parsedData.binNo });
//     if (existingBin) {
//       return res.status(409).json({
//         success: false,
//         message: "Bin number already exists",
//         data: existingBin,
//       });
//     }

//     // Create new bin data entry
//     const newBinData = new BinData({
//       binNo: parsedData.binNo,
//       invoiceNumber: parsedData.invoiceNumber,
//       date: parsedData.date,
//       partNumber: parsedData.partNumber,
//       quantity: parsedData.quantity,
//       descriptionOrPartName: parsedData.descriptionOrPartName,
//       rawQRData: parsedData.rawQRData,
//     });

//     // Save to database
//     const savedBinData = await newBinData.save();

//     res.status(201).json({
//       success: true,
//       message: "Bin data created successfully from QR code",
//       data: savedBinData,
//       parsedData: parsedData,
//     });
//   } catch (error) {
//     console.error("QR processing error:", error);

//     // Handle duplicate bin number error
//     if (error.code === 11000) {
//       return res.status(409).json({
//         success: false,
//         message: "Duplicate entry detected",
//       });
//     }

//     // Handle validation errors
//     if (error.name === "ValidationError") {
//       return res.status(400).json({
//         success: false,
//         message: "Validation error",
//         errors: Object.values(error.errors).map((e) => e.message),
//       });
//     }

//     // Handle parsing errors
//     if (error.message.includes("Failed to parse QR code")) {
//       return res.status(400).json({
//         success: false,
//         message: error.message,
//         originalData: req.body.qrCodeData,
//       });
//     }

//     // Handle other errors
//     res.status(500).json({
//       success: false,
//       message: "Internal server error",
//       error: error.message,
//     });
//   }
// });

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


// Route to update scan progress with sequence counter (POST) - FIXED
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

    // Initialize scanSequence if it doesn't exist
    if (!binData.scanSequence) {
      binData.scanSequence = 0;
    }

    // Initialize scannedQuantity if it doesn't exist
    if (!binData.scannedQuantity) {
      binData.scannedQuantity = 0;
    }

    // Increment scan sequence
    binData.scanSequence += 1;

    // Update scanned quantity (this could be cumulative or the latest scan)
    binData.scannedQuantity = scannedQuantity;

    // Update scan metadata
    binData.lastScannedAt = new Date();
    binData.scannedBy = scannedBy || "system";
    
    if (isValid !== undefined) {
      binData.isValid = isValid;
    }
    
    if (mismatchReason) {
      binData.mismatchReason = mismatchReason;
    }

    // Calculate completion percentage
    const completionPercentage = Math.min(
      Math.round((scannedQuantity / binData.quantity) * 100),
      100
    );
    binData.completionPercentage = completionPercentage;

    // Update status based on completion - FIXED: Use correct enum values
    if (completionPercentage >= 100) {
      binData.status = "completed";
      binData.completedAt = new Date();
    } else if (completionPercentage > 0) {
      binData.status = "in_progress"; // FIXED: Changed from "in-progress" to "in_progress"
    }

    // Save the updated bin data
    const updatedBinData = await binData.save();

    res.status(200).json({
      success: true,
      message: "Scan progress updated successfully",
      data: {
        binNo: updatedBinData.binNo,
        scanSequence: updatedBinData.scanSequence,
        scannedQuantity: updatedBinData.scannedQuantity,
        totalQuantity: updatedBinData.quantity,
        completionPercentage: updatedBinData.completionPercentage,
        status: updatedBinData.status,
        lastScannedAt: updatedBinData.lastScannedAt,
        scannedBy: updatedBinData.scannedBy,
        isValid: updatedBinData.isValid,
        mismatchReason: updatedBinData.mismatchReason
      },
      isCompleted: updatedBinData.status === "completed",
      completionPercentage: updatedBinData.completionPercentage,
      scanCount: updatedBinData.scanSequence
    });
  } catch (error) {
    console.error("Scan progress update error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
});

// Route to reset scan sequence for a bin (POST) - FIXED
router.post("/bindata/reset-scan/:binNo", async (req, res) => {
  try {
    const { binNo } = req.params;

    const binData = await BinData.findOne({ binNo });

    if (!binData) {
      return res.status(404).json({
        success: false,
        message: "Bin data not found",
      });
    }

    // Reset scan-related fields - FIXED: Use correct enum value
    binData.scanSequence = 0;
    binData.scannedQuantity = 0;
    binData.completionPercentage = 0;
    binData.status = "pending"; // This is correct according to schema
    binData.lastScannedAt = null;
    binData.scannedBy = null;
    binData.isValid = true;
    binData.mismatchReason = null;
    binData.completedAt = null;

    const updatedBinData = await binData.save();

    res.status(200).json({
      success: true,
      message: "Scan sequence reset successfully",
      data: {
        binNo: updatedBinData.binNo,
        scanSequence: updatedBinData.scanSequence,
        status: updatedBinData.status
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
});

// Route to get scan statistics for a bin (GET)
router.get("/bindata/scan-stats/:binNo", async (req, res) => {
  try {
    const { binNo } = req.params;

    const binData = await BinData.findOne({ binNo });

    if (!binData) {
      return res.status(404).json({
        success: false,
        message: "Bin data not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Scan statistics retrieved successfully",
      data: {
        binNo: binData.binNo,
        totalScans: binData.scanSequence || 0,
        scannedQuantity: binData.scannedQuantity || 0,
        totalQuantity: binData.quantity,
        completionPercentage: binData.completionPercentage || 0,
        status: binData.status,
        lastScannedAt: binData.lastScannedAt,
        scannedBy: binData.scannedBy,
        isValid: binData.isValid,
        mismatchReason: binData.mismatchReason,
        createdAt: binData.createdAt,
        updatedAt: binData.updatedAt
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
});

// Route to reset scan sequence for a bin (POST)
router.post("/bindata/reset-scan/:binNo", async (req, res) => {
  try {
    const { binNo } = req.params;

    const binData = await BinData.findOne({ binNo });

    if (!binData) {
      return res.status(404).json({
        success: false,
        message: "Bin data not found",
      });
    }

    // Reset scan-related fields
    binData.scanSequence = 0;
    binData.scannedQuantity = 0;
    binData.completionPercentage = 0;
    binData.status = "pending";
    binData.lastScannedAt = null;
    binData.scannedBy = null;
    binData.isValid = true;
    binData.mismatchReason = null;
    binData.completedAt = null;

    const updatedBinData = await binData.save();

    res.status(200).json({
      success: true,
      message: "Scan sequence reset successfully",
      data: {
        binNo: updatedBinData.binNo,
        scanSequence: updatedBinData.scanSequence,
        status: updatedBinData.status
      }
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














// Keep only the main route handler that you have at the top:
router.post("/bindata/qr", async (req, res) => {
  try {
    const { qrCodeData, invoiceNumber, sessionId, timestamp, binNumber, partNumber, totalQuantity } = req.body;

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

    // Check if bin already exists (this is the correct unique constraint)
    const existingBin = await BinData.findOne({ binNo: parsedData.binNo });
    if (existingBin) {
      console.log("Bin already exists, returning existing data:", existingBin.binNo);
      return res.status(409).json({
        success: true, // Changed to true since finding existing data is not an error
        message: "Bin data already exists",
        data: existingBin,
        isExisting: true
      });
    }

    // Create new bin data entry
    const newBinData = new BinData({
      binNo: parsedData.binNo,
      invoiceNumber: parsedData.invoiceNumber, // Multiple bins can have same invoice
      date: parsedData.date,
      partNumber: parsedData.partNumber,
      quantity: parsedData.quantity,
      descriptionOrPartName: parsedData.descriptionOrPartName,
      rawQRData: parsedData.rawQRData,
      sessionId: sessionId,
      timestamp: timestamp,
      scannedQuantity: 0, // Initialize scanning progress
      status: 'pending', // Use the correct enum value
      completionPercentage: 0,
      scanSequence: 0
    });

    // Save to database
    const savedBinData = await newBinData.save();

    console.log("New bin data created successfully:", savedBinData.binNo);

    res.status(201).json({
      success: true,
      message: "Bin data created successfully from QR code",
      data: savedBinData,
      parsedData: parsedData,
      isExisting: false
    });

  } catch (error) {
    console.error("QR processing error:", error);

    // Handle duplicate bin number error (this should be the only duplicate error now)
    if (error.code === 11000) {
      // Check if it's a binNo duplicate (expected)
      if (error.keyValue && error.keyValue.binNo) {
        try {
          const existingBin = await BinData.findOne({ binNo: error.keyValue.binNo });
          return res.status(409).json({
            success: true,
            message: "Bin already exists",
            data: existingBin,
            isExisting: true
          });
        } catch (findError) {
          console.error("Error finding existing bin:", findError);
        }
      }

      // If it's an invoiceNumber duplicate (shouldn't happen after dropping the index)
      if (error.keyValue && error.keyValue.invoiceNumber) {
        return res.status(500).json({
          success: false,
          message: "Database configuration error: invoiceNumber should not be unique. Please contact system administrator.",
          error: "Unexpected unique constraint on invoiceNumber"
        });
      }

      return res.status(409).json({
        success: false,
        message: "Duplicate entry detected",
        error: error.message
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

module.exports = router;
