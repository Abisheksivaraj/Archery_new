const mongoose = require("mongoose");
const binDataSchema = new mongoose.Schema(
  {
    binNo: {
      type: String,
      required: [true, "Bin number is required"],
      unique: true,
      trim: true,
      index: true,
    },
    invoiceNumber: {
      type: String,
      required: [true, "Invoice number is required"],
      trim: true,
      index: true,
    },
    date: {
      type: String,
      required: [true, "Date is required"],
      trim: true,
    },
    partNumber: {
      type: String,
      required: [true, "Part number is required"],
      trim: true,
      index: true,
    },
    quantity: {
      type: Number,
      required: [true, "Quantity is required"],
      min: [1, "Quantity must be at least 1"],
    },
    descriptionOrPartName: {
      type: String,
      required: [true, "Description or part name is required"],
      trim: true,
    },
    rawQRData: {
      type: String,
      trim: true,
    },
    scannedQuantity: {
      type: Number,
      default: 0,
      min: 0,
    },
    // CORRECTED: Array to track all scanned serial numbers for this bin
    serialNumbers: {
      type: [
        {
          serial: {
            type: String,
            required: true,
            trim: true,
          },
          scannedAt: {
            type: Date,
            default: Date.now,
          },
          scannedBy: {
            type: String,
            trim: true,
          },
          scanSequence: {
            type: Number,
          },
          rawBarcodeData: {
            type: String,
            trim: true,
          },
        },
      ],
      default: [],
    },
    status: {
      type: String,
      enum: ["pending", "in_progress", "completed"],
      default: "pending",
    },
    completedAt: {
      type: Date,
    },
    scanSequence: {
      type: Number,
      default: 0,
      min: 0,
    },
    lastScannedAt: {
      type: Date,
      default: null,
    },
    lastScannedSerial: {
      type: String,
      default: null,
      trim: true,
    },
    scannedBy: {
      type: String,
      default: null,
      trim: true,
    },
    isValid: {
      type: Boolean,
      default: true,
    },
    mismatchReason: {
      type: String,
      default: null,
      trim: true,
    },
    completionPercentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
  },
  {
    timestamps: true,
    collection: "bindatas",
  }
);


binDataSchema.methods.hasSerialNumber = function (serialNumber) {
  return this.serialNumbers.some(
    (item) => item.serial.trim() === serialNumber.trim()
  );
};

binDataSchema.methods.addSerialNumber = function (
  serialNumber,
  scannedBy = null,
  rawBarcodeData = null
) {
  if (!this.hasSerialNumber(serialNumber)) {
    this.serialNumbers.push({
      serial: serialNumber,
      scannedAt: new Date(),
      scannedBy: scannedBy,
      scanSequence: this.scanSequence + 1,
      rawBarcodeData: rawBarcodeData,
    });
    this.lastScannedSerial = serialNumber;
    return true;
  }
  return false;
};

// Schema for individual scan events (updated with serial number)
const scanEventSchema = new mongoose.Schema(
  {
    binNo: {
      type: String,
      required: true,
      ref: "BinData",
      index: true,
    },
    partNumber: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    // NEW: Serial number for this specific scan
    serialNumber: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    scanTimestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
    scannedBy: {
      type: String,
      trim: true,
    },
    scanSequence: {
      type: Number,
      default: 0,
      min: 0,
    },
    isValid: {
      type: Boolean,
      default: true,
    },
    mismatchReason: {
      type: String,
      trim: true,
    },
    rawBarcodeData: {
      type: String,
      trim: true,
    },
    invoiceNumber: {
      type: String,
      trim: true,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: "scanevents",
  }
);

// Schema for package/shipping labels
const packageSchema = new mongoose.Schema(
  {
    packageNo: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    binNo: {
      type: String,
      required: true,
      ref: "BinData",
    },
    invoiceNumber: {
      type: String,
      required: true,
      trim: true,
    },
    partNumber: {
      type: String,
      required: true,
      trim: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    status: {
      type: String,
      enum: ["created", "printed", "shipped", "delivered"],
      default: "created",
    },
    printedAt: {
      type: Date,
    },
    shippedAt: {
      type: Date,
    },
    trackingNumber: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
    collection: "packages",
  }
);

// Indexes for efficient querying
binDataSchema.index({ binNo: 1 });
binDataSchema.index({ invoiceNumber: 1 });
binDataSchema.index({ partNumber: 1 });
binDataSchema.index({ status: 1 });
binDataSchema.index({ createdAt: -1 });
binDataSchema.index({ lastScannedAt: -1 });
binDataSchema.index({ "serialNumbers.serial": 1 }); // NEW: Index for serial lookup

scanEventSchema.index({ binNo: 1, scanSequence: 1 });
scanEventSchema.index({ partNumber: 1 });
scanEventSchema.index({ scanTimestamp: -1 });
scanEventSchema.index({ serialNumber: 1 }); // NEW: Index for serial lookup
scanEventSchema.index({ partNumber: 1, serialNumber: 1 }); // NEW: Compound index

packageSchema.index({ packageNo: 1 });
packageSchema.index({ binNo: 1 });
packageSchema.index({ status: 1 });
packageSchema.index({ createdAt: -1 });

// Virtual for completion percentage
binDataSchema.virtual("calculatedCompletionPercentage").get(function () {
  return this.quantity > 0
    ? Math.round((this.scannedQuantity / this.quantity) * 100)
    : 0;
});

// NEW: Method to check if serial number already exists in this bin
binDataSchema.methods.hasSerialNumber = function (serialNumber) {
  return this.serialNumbers.some(
    (item) => item.serial.trim() === serialNumber.trim()
  );
};

// NEW: Method to add serial number to bin
binDataSchema.methods.addSerialNumber = function (
  serialNumber,
  scannedBy = null
) {
  if (!this.hasSerialNumber(serialNumber)) {
    this.serialNumbers.push({
      serial: serialNumber,
      scannedAt: new Date(),
      scannedBy: scannedBy,
      scanSequence: this.scanSequence + 1,
    });
    this.lastScannedSerial = serialNumber;
    return true;
  }
  return false;
};

// Enhanced method to update scan progress with serial number tracking
binDataSchema.methods.updateScanProgress = async function (
  scannedCount,
  scanDetails = {}
) {
  // Increment scan sequence
  this.scanSequence = (this.scanSequence || 0) + 1;

  const prevScannedQuantity = this.scannedQuantity;
  this.scannedQuantity = scannedCount;

  // Update scan metadata
  this.lastScannedAt = new Date();
  this.scannedBy = scanDetails.scannedBy || this.scannedBy;

  // NEW: Add serial number if provided
  if (scanDetails.serialNumber) {
    this.addSerialNumber(scanDetails.serialNumber, scanDetails.scannedBy);
  }

  if (scanDetails.isValid !== undefined) {
    this.isValid = scanDetails.isValid;
  }

  if (scanDetails.mismatchReason) {
    this.mismatchReason = scanDetails.mismatchReason;
  }

  // Calculate completion percentage
  this.completionPercentage = Math.min(
    Math.round((scannedCount / this.quantity) * 100),
    100
  );

  // Update status
  if (this.completionPercentage >= 100) {
    this.status = "completed";
    this.completedAt = new Date();
  } else if (this.completionPercentage > 0) {
    this.status = "in_progress";
  }

  // Save the bin data
  await this.save();

  return this;
};

// NEW: Static method to check for duplicate serial across all bins
binDataSchema.statics.findBySerialNumber = function (serialNumber, partNumber) {
  return this.findOne({
    "serialNumbers.serial": serialNumber,
    partNumber: partNumber,
  });
};

// Static method to get detailed scan history
binDataSchema.statics.getScanHistory = function (binNo) {
  const ScanEvent = mongoose.model("ScanEvent");
  return ScanEvent.find({ binNo }).sort({ scanSequence: 1 });
};

// Static method to get productivity metrics
binDataSchema.statics.getProductivityMetrics = async function (dateRange = {}) {
  const matchStage = {};

  if (dateRange.startDate || dateRange.endDate) {
    matchStage.lastScannedAt = {};
    if (dateRange.startDate)
      matchStage.lastScannedAt.$gte = new Date(dateRange.startDate);
    if (dateRange.endDate)
      matchStage.lastScannedAt.$lte = new Date(dateRange.endDate);
  }

  return this.aggregate([
    { $match: { ...matchStage, scanSequence: { $gt: 0 } } },
    {
      $group: {
        _id: {
          date: {
            $dateToString: { format: "%Y-%m-%d", date: "$lastScannedAt" },
          },
        },
        totalBinsScanned: { $sum: 1 },
        totalScans: { $sum: "$scanSequence" },
        completedBins: {
          $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] },
        },
        inProgressBins: {
          $sum: { $cond: [{ $eq: ["$status", "in_progress"] }, 1, 0] },
        },
      },
    },
    { $sort: { "_id.date": 1 } },
  ]);
};

// Pre-save middleware for packages
packageSchema.pre("save", function (next) {
  if (
    this.isModified("status") &&
    this.status === "printed" &&
    !this.printedAt
  ) {
    this.printedAt = new Date();
  }
  if (
    this.isModified("status") &&
    this.status === "shipped" &&
    !this.shippedAt
  ) {
    this.shippedAt = new Date();
  }
  next();
});

const BinData = mongoose.model("BinData", binDataSchema);
const ScanEvent = mongoose.model("ScanEvent", scanEventSchema);
const Package = mongoose.model("Package", packageSchema);

module.exports = { BinData, ScanEvent, Package };
