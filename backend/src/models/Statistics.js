// models/Statistics.js - FIXED VERSION
const mongoose = require("mongoose");

const statisticsSchema = new mongoose.Schema(
  {
    invoiceNumber: {
      type: String,
      required: true,
      index: true,
    },
    invoiceRemaining: {
      type: Number,
      default: 0,
    },
    binQuantity: {
      type: Number,
      default: 0,
    },
    scannedPartCount: {
      type: Number,
      default: 0,
    },
    binProgress: {
      type: String,
      default: "0/0",
    },
    currentBinTag: {
      type: String,
      default: "",
    },
    totalBinCount: {
      type: Number,
      default: 0,
    },
    completedBinCount: {
      type: Number,
      default: 0,
    },
    partNumber: {
      type: String,
      default: "",
    },
    partName: {
      type: String,
      default: "",
    },
    sessionId: {
      type: String,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["processing", "pass", "fail", "completed"],
      default: "processing",
    },
    originalInvoiceQuantity: {
      type: Number,
      default: 0,
    },
    currentBinProgress: {
      type: Number,
      default: 0,
    },
    overallProgress: {
      type: Number,
      default: 0,
    },
    remainingBinQuantity: {
      type: Number,
      default: 0,
    },
    currentBinScannedQuantity: {
      type: Number,
      default: 0,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },

    // Refresh tracking fields
    isRefresh: {
      type: Boolean,
      default: false,
    },
    refreshTimestamp: {
      type: String,
      default: null,
    },
    refreshCount: {
      type: Number,
      default: 0,
    },
    lastRefreshAt: {
      type: Date,
      default: null,
    },
    originalCreatedAt: {
      type: Date,
      default: null,
    },
    lastUpdated: {
      type: String,
      default: null,
    },

    // Additional metadata
    updateHistory: [
      {
        updatedAt: { type: Date, default: Date.now },
        changes: { type: Object },
        isRefresh: { type: Boolean, default: false },
        sessionId: { type: String },
      },
    ],
  },
  {
    timestamps: true,
    indexes: [
      { invoiceNumber: 1, sessionId: 1 },
      { partNumber: 1 },
      { status: 1 },
      { updatedAt: -1 },
      { refreshCount: 1 },
      { lastRefreshAt: -1 },
    ],
  }
);

// FIXED: Pre-save middleware for findOneAndUpdate operations
statisticsSchema.pre("findOneAndUpdate", function () {
  const update = this.getUpdate();

  // Track the update in history if this is a significant change
  if (update && (update.isRefresh || update.invoiceRemaining !== undefined)) {
    const historyEntry = {
      updatedAt: new Date(),
      changes: {
        invoiceRemaining: update.invoiceRemaining,
        scannedPartCount: update.scannedPartCount,
        binProgress: update.binProgress,
        overallProgress: update.overallProgress,
        status: update.status,
      },
      isRefresh: update.isRefresh || false,
      sessionId: update.sessionId,
    };

    // FIXED: Use setUpdate instead of this.update()
    const currentUpdate = this.getUpdate();
    this.setUpdate({
      ...currentUpdate,
      $push: {
        updateHistory: {
          $each: [historyEntry],
          $slice: -20, // Keep only the last 20 updates
        },
      },
    });
  }

  // Set the updatedAt field
  this.setUpdate({ ...this.getUpdate(), updatedAt: new Date() });
});

// Instance method to get refresh summary
statisticsSchema.methods.getRefreshSummary = function () {
  return {
    totalRefreshes: this.refreshCount || 0,
    lastRefreshed: this.lastRefreshAt,
    originallyCreated: this.originalCreatedAt || this.createdAt,
    daysSinceCreation: this.originalCreatedAt
      ? Math.ceil(
          (Date.now() - this.originalCreatedAt.getTime()) /
            (1000 * 60 * 60 * 24)
        )
      : 0,
    recentUpdates: this.updateHistory ? this.updateHistory.slice(-5) : [],
  };
};

// Static method to get invoice statistics with refresh history
statisticsSchema.statics.getInvoiceWithHistory = function (
  invoiceNumber,
  limit = 10
) {
  return this.find({ invoiceNumber })
    .sort({ updatedAt: -1 })
    .limit(limit)
    .exec();
};

// Static method to get refresh analytics
statisticsSchema.statics.getRefreshAnalytics = function (dateFrom, dateTo) {
  const pipeline = [
    {
      $match: {
        ...(dateFrom && { updatedAt: { $gte: new Date(dateFrom) } }),
        ...(dateTo && { updatedAt: { $lte: new Date(dateTo) } }),
      },
    },
    {
      $group: {
        _id: null,
        totalRecords: { $sum: 1 },
        totalRefreshes: { $sum: "$refreshCount" },
        avgRefreshesPerRecord: { $avg: "$refreshCount" },
        recordsWithRefreshes: {
          $sum: { $cond: [{ $gt: ["$refreshCount", 0] }, 1, 0] },
        },
        mostRefreshedInvoice: {
          $first: {
            $cond: [
              { $eq: ["$refreshCount", { $max: "$refreshCount" }] },
              {
                invoiceNumber: "$invoiceNumber",
                refreshCount: "$refreshCount",
              },
              null,
            ],
          },
        },
      },
    },
  ];

  return this.aggregate(pipeline);
};

module.exports = mongoose.model("Statistics", statisticsSchema);
