// models/BinData.js - Enhanced version
const mongoose = require("mongoose");

// Main bin data schema (existing)
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
    status: {
      type: String,
      enum: ["pending", "in_progress", "completed"],
      default: "pending",
    },
    completedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    collection: "bindatas",
  }
);

// New schema for individual scan events
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
    },
    scanTimestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
    scannedBy: {
      type: String, // Could be user ID or username
      trim: true,
    },
    scanSequence: {
      type: Number, // Track order of scans within a bin
      required: true,
    },
    isValid: {
      type: Boolean,
      default: true, // Track if scan was valid or had mismatch
    },
    mismatchReason: {
      type: String,
      trim: true,
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

scanEventSchema.index({ binNo: 1, scanSequence: 1 });
scanEventSchema.index({ partNumber: 1 });
scanEventSchema.index({ scanTimestamp: -1 });

packageSchema.index({ packageNo: 1 });
packageSchema.index({ binNo: 1 });
packageSchema.index({ status: 1 });
packageSchema.index({ createdAt: -1 });

// Virtual for completion percentage
binDataSchema.virtual("completionPercentage").get(function () {
  return this.quantity > 0
    ? Math.round((this.scannedQuantity / this.quantity) * 100)
    : 0;
});

// Enhanced method to update scan progress with event tracking
binDataSchema.methods.updateScanProgress = async function (
  scannedCount,
  scanDetails = {}
) {
  const prevScannedQuantity = this.scannedQuantity;
  this.scannedQuantity = scannedCount;

  if (scannedCount >= this.quantity) {
    this.status = "completed";
    this.completedAt = new Date();
  } else if (scannedCount > 0) {
    this.status = "in_progress";
  }

  // Save the bin data
  await this.save();

  // Create scan event record if this is a new scan
  if (scannedCount > prevScannedQuantity) {
    const ScanEvent = mongoose.model("ScanEvent");
    await ScanEvent.create({
      binNo: this.binNo,
      partNumber: this.partNumber,
      scanSequence: scannedCount,
      scannedBy: scanDetails.scannedBy || "system",
      isValid: scanDetails.isValid !== false,
      mismatchReason: scanDetails.mismatchReason,
    });
  }

  return this;
};

// Static method to get detailed scan history
binDataSchema.statics.getScanHistory = function (binNo) {
  const ScanEvent = mongoose.model("ScanEvent");
  return ScanEvent.find({ binNo }).sort({ scanSequence: 1 });
};

// Static method to get productivity metrics
binDataSchema.statics.getProductivityMetrics = async function (dateRange = {}) {
  const ScanEvent = mongoose.model("ScanEvent");
  const matchStage = {};

  if (dateRange.startDate || dateRange.endDate) {
    matchStage.scanTimestamp = {};
    if (dateRange.startDate)
      matchStage.scanTimestamp.$gte = new Date(dateRange.startDate);
    if (dateRange.endDate)
      matchStage.scanTimestamp.$lte = new Date(dateRange.endDate);
  }

  return ScanEvent.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: {
          date: {
            $dateToString: { format: "%Y-%m-%d", date: "$scanTimestamp" },
          },
          hour: { $hour: "$scanTimestamp" },
        },
        totalScans: { $sum: 1 },
        validScans: {
          $sum: { $cond: [{ $eq: ["$isValid", true] }, 1, 0] },
        },
        invalidScans: {
          $sum: { $cond: [{ $eq: ["$isValid", false] }, 1, 0] },
        },
      },
    },
    { $sort: { "_id.date": 1, "_id.hour": 1 } },
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
