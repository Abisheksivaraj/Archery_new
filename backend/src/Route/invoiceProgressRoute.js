// routes/invoiceProgress.js
const express = require("express");
const router = express.Router();
const InvoiceProgress = require("../models/invoiceProgressModel");

// POST /api/invoice-progress - Save or update invoice progress
router.post("/", async (req, res) => {
  try {
    const {
      invoiceNumber,
      totalQuantity,
      scannedQuantity,
      totalBins,
      completedBins,
      remainingQuantity,
      binSize,
      partNumber,
      partName,
      sessionId,
      status,
      timestamp,
      metadata,
    } = req.body;

    // Validation
    if (!invoiceNumber || !sessionId) {
      return res.status(400).json({
        success: false,
        message: "Invoice number and session ID are required",
      });
    }

    if (totalQuantity === undefined || totalQuantity < 0) {
      return res.status(400).json({
        success: false,
        message: "Valid total quantity is required",
      });
    }

    console.log(`Saving invoice progress for ${invoiceNumber}:`, {
      totalQuantity,
      scannedQuantity,
      totalBins,
      completedBins,
      remainingQuantity,
    });

    // Check if progress already exists for this invoice
    let existingProgress = await InvoiceProgress.findOne({
      invoiceNumber: invoiceNumber,
    }).sort({ updatedAt: -1 });

    const progressData = {
      invoiceNumber,
      totalQuantity: totalQuantity || 0,
      scannedQuantity: scannedQuantity || 0,
      totalBins: totalBins || 0,
      completedBins: completedBins || 0,
      remainingQuantity:
        remainingQuantity !== undefined ? remainingQuantity : totalQuantity,
      binSize: binSize || 0,
      partNumber: partNumber || "",
      partName: partName || "",
      sessionId,
      status: status || "in_progress",
      timestamp: timestamp || new Date().toISOString(),
      metadata: metadata || {},
    };

    let savedProgress;

    if (existingProgress) {
      // Update existing progress
      savedProgress = await InvoiceProgress.findByIdAndUpdate(
        existingProgress._id,
        progressData,
        { new: true, runValidators: true }
      );

      console.log(`Invoice progress updated for ${invoiceNumber}:`, {
        id: savedProgress._id,
        scannedQuantity: savedProgress.scannedQuantity,
        completedBins: savedProgress.completedBins,
        totalBins: savedProgress.totalBins,
        progressPercentage: savedProgress.progressPercentage,
      });

      return res.status(200).json({
        success: true,
        message: "Invoice progress updated successfully",
        data: savedProgress,
        isUpdate: true,
      });
    } else {
      // Create new progress record
      const newProgress = new InvoiceProgress(progressData);
      savedProgress = await newProgress.save();

      console.log(`New invoice progress created for ${invoiceNumber}:`, {
        id: savedProgress._id,
        totalQuantity: savedProgress.totalQuantity,
        sessionId: savedProgress.sessionId,
      });

      return res.status(201).json({
        success: true,
        message: "Invoice progress saved successfully",
        data: savedProgress,
        isUpdate: false,
      });
    }
  } catch (error) {
    console.error("Error saving invoice progress:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to save invoice progress",
      error: error.message,
    });
  }
});

// GET /api/invoice-progress/:invoiceNumber - Get invoice progress
router.get("/:invoiceNumber", async (req, res) => {
  try {
    const { invoiceNumber } = req.params;
    const { sessionId, includeHistory } = req.query;

    if (!invoiceNumber) {
      return res.status(400).json({
        success: false,
        message: "Invoice number is required",
      });
    }

    console.log(`Fetching invoice progress for ${invoiceNumber}`, {
      sessionId,
      includeHistory,
    });

    // Find the most recent progress for this invoice
    let query = { invoiceNumber };

    if (sessionId) {
      // First try to find for this specific session
      const sessionProgress = await InvoiceProgress.findOne({
        invoiceNumber,
        sessionId,
      }).sort({ updatedAt: -1 });

      if (sessionProgress) {
        console.log(`Found session-specific progress for ${invoiceNumber}:`, {
          sessionId: sessionProgress.sessionId,
          scannedQuantity: sessionProgress.scannedQuantity,
          completedBins: sessionProgress.completedBins,
        });

        let responseData = sessionProgress;

        // Include history if requested
        if (includeHistory === "true") {
          const history = await InvoiceProgress.find({ invoiceNumber })
            .sort({ updatedAt: -1 })
            .limit(10)
            .select(
              "scannedQuantity completedBins totalBins progressPercentage updatedAt sessionId status"
            );

          responseData = {
            ...sessionProgress.toObject(),
            history: history,
          };
        }

        return res.status(200).json({
          success: true,
          data: responseData,
          source: "session-specific",
        });
      }
    }

    // If no session-specific progress found, get the latest for this invoice
    const progress = await InvoiceProgress.findOne(query)
      .sort({ updatedAt: -1 })
      .exec();

    if (!progress) {
      console.log(`No progress found for invoice ${invoiceNumber}`);
      return res.status(404).json({
        success: false,
        message: "No progress found for this invoice",
      });
    }

    console.log(`Found general progress for ${invoiceNumber}:`, {
      sessionId: progress.sessionId,
      scannedQuantity: progress.scannedQuantity,
      completedBins: progress.completedBins,
      progressPercentage: progress.progressPercentage,
    });

    let responseData = progress;

    // Include history if requested
    if (includeHistory === "true") {
      const history = await InvoiceProgress.find({ invoiceNumber })
        .sort({ updatedAt: -1 })
        .limit(10)
        .select(
          "scannedQuantity completedBins totalBins progressPercentage updatedAt sessionId status"
        );

      responseData = {
        ...progress.toObject(),
        history: history,
      };
    }

    return res.status(200).json({
      success: true,
      data: responseData,
      source: "latest-available",
    });
  } catch (error) {
    console.error("Error fetching invoice progress:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch invoice progress",
      error: error.message,
    });
  }
});

// GET /api/invoice-progress - Get all invoice progress with filters
router.get("/", async (req, res) => {
  try {
    const {
      invoiceNumber,
      partNumber,
      status,
      sessionId,
      limit = 50,
      offset = 0,
      sortBy = "updatedAt",
      sortOrder = "desc",
      dateFrom,
      dateTo,
    } = req.query;

    let query = {};
    if (invoiceNumber) {
      query.invoiceNumber = new RegExp(invoiceNumber, "i"); // Case-insensitive search
    }
    if (partNumber) {
      query.partNumber = new RegExp(partNumber, "i");
    }
    if (status) {
      query.status = status;
    }
    if (sessionId) {
      query.sessionId = sessionId;
    }

    // Date range filter
    if (dateFrom || dateTo) {
      query.updatedAt = {};
      if (dateFrom) query.updatedAt.$gte = new Date(dateFrom);
      if (dateTo) query.updatedAt.$lte = new Date(dateTo);
    }

    const sort = {};
    sort[sortBy] = sortOrder === "asc" ? 1 : -1;

    console.log(`Fetching invoice progress list with filters:`, {
      query,
      limit: parseInt(limit),
      offset: parseInt(offset),
      sort,
    });

    const progress = await InvoiceProgress.find(query)
      .sort(sort)
      .limit(parseInt(limit))
      .skip(parseInt(offset))
      .exec();

    const total = await InvoiceProgress.countDocuments(query);

    console.log(
      `Found ${progress.length} progress records out of ${total} total`
    );

    return res.status(200).json({
      success: true,
      data: progress,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: parseInt(offset) + progress.length < total,
        currentPage: Math.floor(parseInt(offset) / parseInt(limit)) + 1,
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("Error fetching invoice progress list:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch invoice progress",
      error: error.message,
    });
  }
});

// PUT /api/invoice-progress/:id - Update specific progress record
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    console.log(`Updating invoice progress record ${id}:`, updateData);

    const updatedProgress = await InvoiceProgress.findByIdAndUpdate(
      id,
      updateData,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!updatedProgress) {
      return res.status(404).json({
        success: false,
        message: "Invoice progress record not found",
      });
    }

    console.log(`Invoice progress record updated:`, {
      id: updatedProgress._id,
      invoiceNumber: updatedProgress.invoiceNumber,
      progressPercentage: updatedProgress.progressPercentage,
    });

    return res.status(200).json({
      success: true,
      message: "Invoice progress updated successfully",
      data: updatedProgress,
    });
  } catch (error) {
    console.error("Error updating invoice progress:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update invoice progress",
      error: error.message,
    });
  }
});

// DELETE /api/invoice-progress/:invoiceNumber - Delete progress for an invoice
router.delete("/:invoiceNumber", async (req, res) => {
  try {
    const { invoiceNumber } = req.params;
    const { sessionId, confirmDelete } = req.query;

    if (!invoiceNumber) {
      return res.status(400).json({
        success: false,
        message: "Invoice number is required",
      });
    }

    if (!confirmDelete) {
      return res.status(400).json({
        success: false,
        message:
          "Delete confirmation required. Add ?confirmDelete=true to proceed",
      });
    }

    let query = { invoiceNumber };
    if (sessionId) {
      query.sessionId = sessionId;
    }

    console.log(`Deleting invoice progress for ${invoiceNumber}:`, query);

    const deletedProgress = await InvoiceProgress.deleteMany(query);

    console.log(
      `Deleted ${deletedProgress.deletedCount} progress records for ${invoiceNumber}`
    );

    return res.status(200).json({
      success: true,
      message: `Deleted ${deletedProgress.deletedCount} progress records`,
      deletedCount: deletedProgress.deletedCount,
    });
  } catch (error) {
    console.error("Error deleting invoice progress:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete invoice progress",
      error: error.message,
    });
  }
});

// GET /api/invoice-progress/dashboard/summary - Get dashboard summary
router.get("/dashboard/summary", async (req, res) => {
  try {
    const { dateFrom, dateTo, status } = req.query;

    let dateFilter = {};
    if (dateFrom || dateTo) {
      dateFilter.updatedAt = {};
      if (dateFrom) dateFilter.updatedAt.$gte = new Date(dateFrom);
      if (dateTo) dateFilter.updatedAt.$lte = new Date(dateTo);
    }

    let query = { ...dateFilter };
    if (status) query.status = status;

    console.log(`Generating dashboard summary with filters:`, query);

    const summary = await InvoiceProgress.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalInvoices: { $sum: 1 },
          totalScannedParts: { $sum: "$scannedQuantity" },
          totalTargetParts: { $sum: "$totalQuantity" },
          totalBins: { $sum: "$totalBins" },
          totalCompletedBins: { $sum: "$completedBins" },
          avgProgress: {
            $avg: {
              $cond: [
                { $gt: ["$totalBins", 0] },
                { $divide: ["$completedBins", "$totalBins"] },
                0,
              ],
            },
          },
          avgPartProgress: {
            $avg: {
              $cond: [
                { $gt: ["$totalQuantity", 0] },
                { $divide: ["$scannedQuantity", "$totalQuantity"] },
                0,
              ],
            },
          },
          completedInvoices: {
            $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] },
          },
          inProgressInvoices: {
            $sum: { $cond: [{ $eq: ["$status", "in_progress"] }, 1, 0] },
          },
          pausedInvoices: {
            $sum: { $cond: [{ $eq: ["$status", "paused"] }, 1, 0] },
          },
        },
      },
    ]);

    const result =
      summary.length > 0
        ? summary[0]
        : {
            totalInvoices: 0,
            totalScannedParts: 0,
            totalTargetParts: 0,
            totalBins: 0,
            totalCompletedBins: 0,
            avgProgress: 0,
            avgPartProgress: 0,
            completedInvoices: 0,
            inProgressInvoices: 0,
            pausedInvoices: 0,
          };

    // Convert averages to percentages
    if (result.avgProgress) {
      result.avgProgress = Math.round(result.avgProgress * 100);
    }
    if (result.avgPartProgress) {
      result.avgPartProgress = Math.round(result.avgPartProgress * 100);
    }

    // Calculate additional metrics
    result.totalRemainingParts = Math.max(
      0,
      result.totalTargetParts - result.totalScannedParts
    );
    result.totalRemainingBins = Math.max(
      0,
      result.totalBins - result.totalCompletedBins
    );
    result.overallEfficiency =
      result.totalTargetParts > 0
        ? Math.round((result.totalScannedParts / result.totalTargetParts) * 100)
        : 0;

    console.log(`Dashboard summary generated:`, result);

    return res.status(200).json({
      success: true,
      data: result,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error fetching progress summary:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch progress summary",
      error: error.message,
    });
  }
});

// GET /api/invoice-progress/:invoiceNumber/summary - Get detailed summary for specific invoice
router.get("/:invoiceNumber/summary", async (req, res) => {
  try {
    const { invoiceNumber } = req.params;

    if (!invoiceNumber) {
      return res.status(400).json({
        success: false,
        message: "Invoice number is required",
      });
    }

    console.log(`Generating detailed summary for invoice ${invoiceNumber}`);

    const progress = await InvoiceProgress.findOne({ invoiceNumber })
      .sort({ updatedAt: -1 })
      .exec();

    if (!progress) {
      return res.status(404).json({
        success: false,
        message: "No progress found for this invoice",
      });
    }

    // Get summary using instance method
    const summary = progress.getProgressSummary();

    // Get recent history
    const history = await InvoiceProgress.find({ invoiceNumber })
      .sort({ updatedAt: -1 })
      .limit(5)
      .select(
        "scannedQuantity completedBins progressPercentage updatedAt status"
      );

    const detailedSummary = {
      ...summary,
      history: history,
      efficiency: {
        partsPerHour: progress.getEstimatedTimeRemaining()
          ? Math.round(
              60 /
                (progress.getEstimatedTimeRemaining() /
                  progress.remainingQuantity)
            )
          : null,
        estimatedCompletion: progress.getEstimatedTimeRemaining()
          ? new Date(
              Date.now() + progress.getEstimatedTimeRemaining() * 60 * 1000
            )
          : null,
      },
      timeline: {
        started: progress.startedAt,
        lastUpdate: progress.updatedAt,
        lastBinCompleted: progress.lastBinCompletedAt,
        completed: progress.completedAt,
      },
    };

    console.log(`Detailed summary generated for ${invoiceNumber}:`, {
      progressPercentage: summary.progressPercentage,
      binProgressPercentage: summary.binProgressPercentage,
      status: summary.status,
    });

    return res.status(200).json({
      success: true,
      data: detailedSummary,
    });
  } catch (error) {
    console.error("Error generating invoice summary:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to generate invoice summary",
      error: error.message,
    });
  }
});

// PATCH /api/invoice-progress/:invoiceNumber/status - Update invoice status
router.patch("/:invoiceNumber/status", async (req, res) => {
  try {
    const { invoiceNumber } = req.params;
    const { status, notes } = req.body;

    if (!invoiceNumber || !status) {
      return res.status(400).json({
        success: false,
        message: "Invoice number and status are required",
      });
    }

    const validStatuses = ["in_progress", "completed", "paused", "cancelled"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
      });
    }

    console.log(`Updating status for invoice ${invoiceNumber} to ${status}`);

    const updateData = {
      status,
      updatedAt: new Date(),
    };

    // Add completion timestamp if completing
    if (status === "completed") {
      updateData.completedAt = new Date();
    } else if (status !== "completed") {
      updateData.completedAt = null;
    }

    // Add notes to metadata if provided
    if (notes) {
      updateData["metadata.notes"] = notes;
    }

    const updatedProgress = await InvoiceProgress.findOneAndUpdate(
      { invoiceNumber },
      updateData,
      { new: true, runValidators: true }
    );

    if (!updatedProgress) {
      return res.status(404).json({
        success: false,
        message: "Invoice progress not found",
      });
    }

    console.log(`Status updated for invoice ${invoiceNumber}:`, {
      oldStatus: "unknown",
      newStatus: updatedProgress.status,
      completedAt: updatedProgress.completedAt,
    });

    return res.status(200).json({
      success: true,
      message: `Invoice status updated to ${status}`,
      data: updatedProgress,
    });
  } catch (error) {
    console.error("Error updating invoice status:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update invoice status",
      error: error.message,
    });
  }
});

module.exports = router;
