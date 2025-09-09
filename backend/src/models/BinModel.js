// models/BinData.js - Enhanced version with all required fields
const mongoose = require("mongoose");

// Main bin data schema (updated with all scan tracking fields)
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
      enum: ["pending", "in_progress", "completed"], // Note: using "in_progress" with underscore
      default: "pending",
    },
    completedAt: {
      type: Date,
    },
    // NEW FIELDS for scan sequence tracking
    scanSequence: {
      type: Number,
      default: 0,
      min: 0,
    },
    lastScannedAt: {
      type: Date,
      default: null,
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

// Schema for individual scan events (keeping this for historical tracking if needed)
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

scanEventSchema.index({ binNo: 1, scanSequence: 1 });
scanEventSchema.index({ partNumber: 1 });
scanEventSchema.index({ scanTimestamp: -1 });

packageSchema.index({ packageNo: 1 });
packageSchema.index({ binNo: 1 });
packageSchema.index({ status: 1 });
packageSchema.index({ createdAt: -1 });

// Virtual for completion percentage (alternative way to calculate if needed)
binDataSchema.virtual("calculatedCompletionPercentage").get(function () {
  return this.quantity > 0
    ? Math.round((this.scannedQuantity / this.quantity) * 100)
    : 0;
});

// Enhanced method to update scan progress with event tracking (simplified for sequence approach)
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
  this.scannedBy = scanDetails.scannedBy || "system";

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
    this.status = "in_progress"; // Correct enum value
  }

  // Save the bin data
  await this.save();

  return this;
};

// Static method to get detailed scan history (using ScanEvent if you want to keep detailed logs)
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
