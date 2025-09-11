// models/InvoiceProgress.js
const mongoose = require("mongoose");

const invoiceProgressSchema = new mongoose.Schema(
  {
    invoiceNumber: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    totalQuantity: {
      type: Number,
      required: true,
      min: 0,
    },
    scannedQuantity: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalBins: {
      type: Number,
      default: 0,
      min: 0,
    },
    completedBins: {
      type: Number,
      default: 0,
      min: 0,
    },
    remainingQuantity: {
      type: Number,
      required: true,
      min: 0,
    },
    binSize: {
      type: Number,
      default: 0,
      min: 0,
    },
    partNumber: {
      type: String,
      default: "",
      trim: true,
    },
    partName: {
      type: String,
      default: "",
      trim: true,
    },
    sessionId: {
      type: String,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["in_progress", "completed", "paused", "cancelled"],
      default: "in_progress",
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    // Additional tracking fields
    startedAt: {
      type: Date,
      default: Date.now,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    lastBinCompletedAt: {
      type: Date,
      default: null,
    },
    // Progress tracking
    progressPercentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    binProgressPercentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    // Metadata
    metadata: {
      operatorId: { type: String, default: "" },
      workstation: { type: String, default: "" },
      shift: { type: String, default: "" },
      notes: { type: String, default: "" },
    },
  },
  {
    timestamps: true,
    indexes: [
      { invoiceNumber: 1 },
      { sessionId: 1 },
      { status: 1 },
      { partNumber: 1 },
      { updatedAt: -1 },
      { invoiceNumber: 1, sessionId: 1 }, // Compound index
    ],
  }
);

// Virtual field for progress calculation
invoiceProgressSchema.virtual('calculatedProgress').get(function() {
  if (this.totalQuantity > 0) {
    return Math.round((this.scannedQuantity / this.totalQuantity) * 100);
  }
  return 0;
});

// Virtual field for bin progress calculation
invoiceProgressSchema.virtual('calculatedBinProgress').get(function() {
  if (this.totalBins > 0) {
    return Math.round((this.completedBins / this.totalBins) * 100);
  }
  return 0;
});

// Pre-save middleware to update calculated fields
invoiceProgressSchema.pre('save', function(next) {
  // Update progress percentages
  if (this.totalQuantity > 0) {
    this.progressPercentage = Math.round((this.scannedQuantity / this.totalQuantity) * 100);
  }
  
  if (this.totalBins > 0) {
    this.binProgressPercentage = Math.round((this.completedBins / this.totalBins) * 100);
  }
  
  // Update remaining quantity
  this.remainingQuantity = Math.max(0, this.totalQuantity - this.scannedQuantity);
  
  // Update completion status
  if (this.scannedQuantity >= this.totalQuantity && this.totalQuantity > 0) {
    this.status = 'completed';
    if (!this.completedAt) {
      this.completedAt = new Date();
    }
  } else if (this.status === 'completed' && this.scannedQuantity < this.totalQuantity) {
    this.status = 'in_progress';
    this.completedAt = null;
  }
  
  next();
});

// Pre-update middleware
invoiceProgressSchema.pre('findOneAndUpdate', function() {
  const update = this.getUpdate();
  
  if (update) {
    // Calculate progress if quantities are being updated
    if (update.totalQuantity !== undefined || update.scannedQuantity !== undefined) {
      const totalQty = update.totalQuantity || 0;
      const scannedQty = update.scannedQuantity || 0;
      
      if (totalQty > 0) {
        update.progressPercentage = Math.round((scannedQty / totalQty) * 100);
      }
      
      update.remainingQuantity = Math.max(0, totalQty - scannedQty);
      
      // Update status based on completion
      if (scannedQty >= totalQty && totalQty > 0) {
        update.status = 'completed';
        update.completedAt = new Date();
      } else if (update.status === 'completed' && scannedQty < totalQty) {
        update.status = 'in_progress';
        update.completedAt = null;
      }
    }
    
    // Calculate bin progress if bin counts are being updated
    if (update.totalBins !== undefined || update.completedBins !== undefined) {
      const totalBins = update.totalBins || 0;
      const completedBins = update.completedBins || 0;
      
      if (totalBins > 0) {
        update.binProgressPercentage = Math.round((completedBins / totalBins) * 100);
      }
      
      // Update last bin completion time if a bin was just completed
      const currentCompletedBins = this.getQuery().completedBins || 0;
      if (completedBins > currentCompletedBins) {
        update.lastBinCompletedAt = new Date();
      }
    }
    
    // Always update the timestamp
    update.updatedAt = new Date();
  }
});

// Instance methods
invoiceProgressSchema.methods.getProgressSummary = function() {
  return {
    invoiceNumber: this.invoiceNumber,
    partNumber: this.partNumber,
    partName: this.partName,
    totalQuantity: this.totalQuantity,
    scannedQuantity: this.scannedQuantity,
    remainingQuantity: this.remainingQuantity,
    progressPercentage: this.progressPercentage,
    totalBins: this.totalBins,
    completedBins: this.completedBins,
    binProgressPercentage: this.binProgressPercentage,
    status: this.status,
    startedAt: this.startedAt,
    completedAt: this.completedAt,
    sessionId: this.sessionId,
    estimatedTimeRemaining: this.getEstimatedTimeRemaining(),
  };
};

invoiceProgressSchema.methods.getEstimatedTimeRemaining = function() {
  if (this.status === 'completed' || this.scannedQuantity === 0) {
    return null;
  }
  
  const timeElapsed = Date.now() - this.startedAt.getTime();
  const ratePerMinute = this.scannedQuantity / (timeElapsed / (1000 * 60));
  
  if (ratePerMinute > 0) {
    const minutesRemaining = this.remainingQuantity / ratePerMinute;
    return Math.round(minutesRemaining);
  }
  
  return null;
};

// Static methods
invoiceProgressSchema.statics.getActiveProgress = function() {
  return this.find({ status: { $in: ['in_progress', 'paused'] } })
    .sort({ updatedAt: -1 })
    .exec();
};

invoiceProgressSchema.statics.getProgressByInvoice = function(invoiceNumber) {
  return this.findOne({ invoiceNumber })
    .sort({ updatedAt: -1 })
    .exec();
};

invoiceProgressSchema.statics.getProgressStats = function(dateFrom, dateTo) {
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
        totalInvoices: { $sum: 1 },
        completedInvoices: {
          $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] },
        },
        totalParts: { $sum: '$totalQuantity' },
        scannedParts: { $sum: '$scannedQuantity' },
        totalBins: { $sum: '$totalBins' },
        completedBins: { $sum: '$completedBins' },
        avgProgressPercentage: { $avg: '$progressPercentage' },
        avgBinProgressPercentage: { $avg: '$binProgressPercentage' },
      },
    },
  ];
  
  return this.aggregate(pipeline);
};

// Enable virtuals in JSON output
invoiceProgressSchema.set('toJSON', { virtuals: true });
invoiceProgressSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model("InvoiceProgress", invoiceProgressSchema);