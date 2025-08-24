// models/BarcodeData.js
const mongoose = require("mongoose");

const barcodeDataSchema = new mongoose.Schema(
  {
    // Primary fields from barcode
    vendorCode: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    poNumber: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    invoiceNumber: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      index: true,
    },
    date: {
      type: String,
      required: true,
      trim: true,
    },
    vehicleNumber: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    partNumber: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    quantity: {
      type: String,
      required: true,
      trim: true,
    },

    // Additional fields
    field5: {
      type: String,
      default: "",
      trim: true,
    },
    field6: {
      type: String,
      default: "",
      trim: true,
    },
    field7: {
      type: String,
      default: "",
      trim: true,
    },
    field9: {
      type: String,
      default: "",
      trim: true,
    },
    field10: {
      type: String,
      default: "",
      trim: true,
    },
    field11: {
      type: String,
      default: "",
      trim: true,
    },
    field13: {
      type: String,
      default: "",
      trim: true,
    },
    field15: {
      type: String,
      default: "",
      trim: true,
    },

    // Metadata
    rawData: {
      type: String,
      required: true,
    },
    totalParts: {
      type: Number,
      required: true,
    },

    // System fields (NO userId field)
    scannedAt: {
      type: Date,
      default: Date.now,
    },
    processedAt: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: ["scanned", "processed", "error"],
      default: "scanned",
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt automatically
  }
);

// Create compound indexes for better query performance
barcodeDataSchema.index({ vendorCode: 1, poNumber: 1 });
barcodeDataSchema.index({ scannedAt: -1 });
barcodeDataSchema.index({ status: 1, scannedAt: -1 });

// Instance methods
barcodeDataSchema.methods.markAsProcessed = function () {
  this.status = "processed";
  this.processedAt = new Date();
  return this.save();
};

barcodeDataSchema.methods.markAsError = function () {
  this.status = "error";
  return this.save();
};

// Static methods
barcodeDataSchema.statics.findByInvoiceNumber = function (invoiceNumber) {
  return this.findOne({ invoiceNumber });
};

barcodeDataSchema.statics.findByVendorCode = function (vendorCode) {
  return this.find({ vendorCode }).sort({ scannedAt: -1 });
};

barcodeDataSchema.statics.findByDateRange = function (startDate, endDate) {
  return this.find({
    scannedAt: {
      $gte: new Date(startDate),
      $lte: new Date(endDate),
    },
  }).sort({ scannedAt: -1 });
};

barcodeDataSchema.statics.findRecent = function (limit = 10) {
  return this.find({}).sort({ scannedAt: -1 }).limit(limit);
};

module.exports = mongoose.model("BarcodeData", barcodeDataSchema);
