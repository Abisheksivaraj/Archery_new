// routes/statistics.js
const express = require("express");
const router = express.Router();
const Statistics = require("../models/Statistics");



// GET /api/statistics/:invoiceNumber - Get statistics for an invoice
router.get("/:invoiceNumber", async (req, res) => {
  try {
    const { invoiceNumber } = req.params;
    const { sessionId } = req.query;

    if (!invoiceNumber) {
      return res.status(400).json({
        success: false,
        message: "Invoice number is required",
      });
    }

    let query = { invoiceNumber };
    if (sessionId) {
      query.sessionId = sessionId;
    }

    const statistics = await Statistics.findOne(query)
      .sort({ updatedAt: -1 })
      .exec();

    if (!statistics) {
      return res.status(404).json({
        success: false,
        message: "No statistics found for this invoice",
      });
    }

    return res.status(200).json({
      success: true,
      data: statistics,
    });
  } catch (error) {
    console.error("Error fetching statistics:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch statistics",
      error: error.message,
    });
  }
});

// GET /api/statistics - Get all statistics with filters
router.get("/", async (req, res) => {
  try {
    const {
      invoiceNumber,
      partNumber,
      status,
      sessionId,
      limit = 100,
      offset = 0,
      sortBy = "updatedAt",
      sortOrder = "desc",
    } = req.query;

    let query = {};
    if (invoiceNumber) query.invoiceNumber = invoiceNumber;
    if (partNumber) query.partNumber = partNumber;
    if (status) query.status = status;
    if (sessionId) query.sessionId = sessionId;

    const sort = {};
    sort[sortBy] = sortOrder === "asc" ? 1 : -1;

    const statistics = await Statistics.find(query)
      .sort(sort)
      .limit(parseInt(limit))
      .skip(parseInt(offset))
      .exec();

    const total = await Statistics.countDocuments(query);

    return res.status(200).json({
      success: true,
      data: statistics,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: parseInt(offset) + statistics.length < total,
      },
    });
  } catch (error) {
    console.error("Error fetching statistics list:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch statistics",
      error: error.message,
    });
  }
});

// PUT /api/statistics/:id - Update specific statistics record
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const updatedStats = await Statistics.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!updatedStats) {
      return res.status(404).json({
        success: false,
        message: "Statistics record not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Statistics updated successfully",
      data: updatedStats,
    });
  } catch (error) {
    console.error("Error updating statistics:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update statistics",
      error: error.message,
    });
  }
});

// DELETE /api/statistics/:invoiceNumber - Delete statistics for an invoice
router.delete("/:invoiceNumber", async (req, res) => {
  try {
    const { invoiceNumber } = req.params;
    const { sessionId } = req.query;

    if (!invoiceNumber) {
      return res.status(400).json({
        success: false,
        message: "Invoice number is required",
      });
    }

    let query = { invoiceNumber };
    if (sessionId) {
      query.sessionId = sessionId;
    }

    const deletedStats = await Statistics.deleteMany(query);

    return res.status(200).json({
      success: true,
      message: `Deleted ${deletedStats.deletedCount} statistics records`,
      deletedCount: deletedStats.deletedCount,
    });
  } catch (error) {
    console.error("Error deleting statistics:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete statistics",
      error: error.message,
    });
  }
});

// GET /api/statistics/dashboard/summary - Get dashboard summary
router.get("/dashboard/summary", async (req, res) => {
  try {
    const { dateFrom, dateTo, invoiceNumber } = req.query;

    let dateFilter = {};
    if (dateFrom || dateTo) {
      dateFilter.updatedAt = {};
      if (dateFrom) dateFilter.updatedAt.$gte = new Date(dateFrom);
      if (dateTo) dateFilter.updatedAt.$lte = new Date(dateTo);
    }

    let query = { ...dateFilter };
    if (invoiceNumber) query.invoiceNumber = invoiceNumber;

    const summary = await Statistics.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalInvoices: { $sum: 1 },
          totalScannedParts: { $sum: "$scannedPartCount" },
          totalBinQuantity: { $sum: "$binQuantity" },
          avgOverallProgress: { $avg: "$overallProgress" },
          completedInvoices: {
            $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] },
          },
          inProgressInvoices: {
            $sum: { $cond: [{ $ne: ["$status", "completed"] }, 1, 0] },
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
            totalBinQuantity: 0,
            avgOverallProgress: 0,
            completedInvoices: 0,
            inProgressInvoices: 0,
          };

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Error fetching dashboard summary:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch dashboard summary",
      error: error.message,
    });
  }
});



// POST /api/statistics - Save or update statistics with refresh support
router.post('/', async (req, res) => {
  try {
    const {
      invoiceNumber,
      invoiceRemaining,
      binQuantity,
      scannedPartCount,
      binProgress,
      currentBinTag,
      totalBinCount,
      completedBinCount,
      partNumber,
      partName,
      sessionId,
      status,
      originalInvoiceQuantity,
      currentBinProgress,
      overallProgress,
      remainingBinQuantity,
      currentBinScannedQuantity,
      timestamp,
      isRefresh,
      refreshTimestamp,
      lastUpdated
    } = req.body;

    if (!invoiceNumber || !sessionId) {
      return res.status(400).json({
        success: false,
        message: 'Invoice number and session ID are required'
      });
    }

    // Check if statistics already exist for this invoice
    let existingStats = await Statistics.findOne({
      invoiceNumber: invoiceNumber,
      $or: [
        { sessionId: sessionId },
        // Also look for any existing stats for this invoice (for refresh scenarios)
        { invoiceNumber: invoiceNumber }
      ]
    }).sort({ updatedAt: -1 }); // Get the most recent one

    const statisticsData = {
      invoiceNumber,
      invoiceRemaining: invoiceRemaining || 0,
      binQuantity: binQuantity || 0,
      scannedPartCount: scannedPartCount || 0,
      binProgress: binProgress || "0/0",
      currentBinTag: currentBinTag || "",
      totalBinCount: totalBinCount || 0,
      completedBinCount: completedBinCount || 0,
      partNumber: partNumber || "",
      partName: partName || "",
      sessionId,
      status: status || "processing",
      originalInvoiceQuantity: originalInvoiceQuantity || 0,
      currentBinProgress: currentBinProgress || 0,
      overallProgress: overallProgress || 0,
      remainingBinQuantity: remainingBinQuantity || 0,
      currentBinScannedQuantity: currentBinScannedQuantity || 0,
      timestamp: timestamp || new Date().toISOString(),
      isRefresh: isRefresh || false,
      refreshTimestamp: refreshTimestamp,
      lastUpdated: lastUpdated || new Date().toISOString()
    };

    let savedStats;

    if (existingStats) {
      // Update existing statistics
      const updateData = {
        ...statisticsData,
        // Preserve original creation data but update refresh info
        originalCreatedAt: existingStats.createdAt || existingStats.originalCreatedAt,
        refreshCount: (existingStats.refreshCount || 0) + (isRefresh ? 1 : 0),
        lastRefreshAt: isRefresh ? new Date() : existingStats.lastRefreshAt,
        updatedAt: new Date()
      };

      savedStats = await Statistics.findByIdAndUpdate(
        existingStats._id,
        updateData,
        { new: true, runValidators: true }
      );

      console.log(`Statistics ${isRefresh ? 'refreshed' : 'updated'} for invoice ${invoiceNumber}:`, {
        id: savedStats._id,
        refreshCount: savedStats.refreshCount,
        isRefresh: isRefresh
      });

      return res.status(200).json({
        success: true,
        message: isRefresh ? 
          `Statistics refreshed successfully (refresh #${savedStats.refreshCount})` : 
          'Statistics updated successfully',
        data: savedStats,
        metadata: {
          isRefresh: isRefresh,
          refreshCount: savedStats.refreshCount,
          originalCreatedAt: savedStats.originalCreatedAt
        }
      });
    } else {
      // Create new statistics record
      const newStatsData = {
        ...statisticsData,
        createdAt: new Date(),
        originalCreatedAt: new Date(),
        refreshCount: 0,
        lastRefreshAt: null
      };
      
      const newStats = new Statistics(newStatsData);
      savedStats = await newStats.save();

      console.log(`New statistics created for invoice ${invoiceNumber}:`, savedStats._id);

      return res.status(201).json({
        success: true,
        message: 'Statistics saved successfully',
        data: savedStats,
        metadata: {
          isRefresh: false,
          refreshCount: 0,
          isNewRecord: true
        }
      });
    }

  } catch (error) {
    console.error('Error saving statistics:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to save statistics',
      error: error.message
    });
  }
});

// NEW: GET /api/statistics/:invoiceNumber/refresh - Force refresh statistics for an invoice
router.get('/:invoiceNumber/refresh', async (req, res) => {
  try {
    const { invoiceNumber } = req.params;
    const { sessionId, forceRecalculate } = req.query;

    if (!invoiceNumber) {
      return res.status(400).json({
        success: false,
        message: 'Invoice number is required'
      });
    }

    // Get current statistics
    let query = { invoiceNumber };
    if (sessionId) {
      query.sessionId = sessionId;
    }

    const currentStats = await Statistics.findOne(query)
      .sort({ updatedAt: -1 })
      .exec();

    if (!currentStats) {
      return res.status(404).json({
        success: false,
        message: 'No statistics found for this invoice to refresh'
      });
    }

    // If force recalculate is requested, fetch fresh data from other APIs
    let refreshedData = { ...currentStats.toObject() };
    
    if (forceRecalculate === 'true') {
      // Here you could add logic to fetch fresh data from other services
      // For now, we'll just update the refresh metadata
      refreshedData.lastRefreshAt = new Date();
      refreshedData.refreshCount = (currentStats.refreshCount || 0) + 1;
      refreshedData.isRefresh = true;
      refreshedData.refreshTimestamp = new Date().toISOString();
    }

    // Update the statistics with refresh metadata
    const updatedStats = await Statistics.findByIdAndUpdate(
      currentStats._id,
      {
        ...refreshedData,
        lastRefreshAt: new Date(),
        refreshCount: (currentStats.refreshCount || 0) + 1,
        updatedAt: new Date()
      },
      { new: true, runValidators: true }
    );

    return res.status(200).json({
      success: true,
      message: `Statistics refreshed successfully for invoice ${invoiceNumber}`,
      data: updatedStats,
      metadata: {
        refreshCount: updatedStats.refreshCount,
        lastRefreshAt: updatedStats.lastRefreshAt,
        previousUpdateAt: currentStats.updatedAt
      }
    });

  } catch (error) {
    console.error('Error refreshing statistics:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to refresh statistics',
      error: error.message
    });
  }
});

// NEW: GET /api/statistics/invoice/:invoiceNumber/summary - Get invoice summary with latest data
router.get('/invoice/:invoiceNumber/summary', async (req, res) => {
  try {
    const { invoiceNumber } = req.params;

    if (!invoiceNumber) {
      return res.status(400).json({
        success: false,
        message: 'Invoice number is required'
      });
    }

    // Get all statistics for this invoice
    const allStats = await Statistics.find({ invoiceNumber })
      .sort({ updatedAt: -1 })
      .limit(10) // Get last 10 updates
      .exec();

    if (allStats.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No statistics found for this invoice'
      });
    }

    const latestStats = allStats[0];
    const summary = {
      invoiceNumber: invoiceNumber,
      currentStats: latestStats,
      summary: {
        totalUpdates: allStats.length,
        refreshCount: latestStats.refreshCount || 0,
        firstRecorded: allStats[allStats.length - 1].createdAt,
        lastUpdated: latestStats.updatedAt,
        lastRefreshed: latestStats.lastRefreshAt,
        currentProgress: {
          invoiceRemaining: latestStats.invoiceRemaining,
          scannedPartCount: latestStats.scannedPartCount,
          binProgress: latestStats.binProgress,
          overallProgress: latestStats.overallProgress,
          status: latestStats.status
        }
      },
      history: allStats.slice(1, 6).map(stat => ({
        updatedAt: stat.updatedAt,
        invoiceRemaining: stat.invoiceRemaining,
        scannedPartCount: stat.scannedPartCount,
        binProgress: stat.binProgress,
        isRefresh: stat.isRefresh || false
      }))
    };

    return res.status(200).json({
      success: true,
      data: summary
    });

  } catch (error) {
    console.error('Error fetching invoice summary:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch invoice summary',
      error: error.message
    });
  }
});

module.exports = router;
