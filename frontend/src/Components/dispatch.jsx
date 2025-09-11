import React, { useEffect, useState, useRef, useCallback } from "react";
import { toast, Toaster } from "react-hot-toast";

import { api } from "../apiConfig";
import {
  Alert,
  AlertTitle,
  Box,
  Container,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  LinearProgress,
  MenuItem,
  Paper,
  Select,
  TextField,
  Tooltip,
  Typography,
  useTheme,
  useMediaQuery,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from "@mui/material";

import SettingsIcon from "@mui/icons-material/Settings";
import QrCodeScannerIcon from "@mui/icons-material/QrCodeScanner";
import InventoryIcon from "@mui/icons-material/Inventory";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import BackpackIcon from "@mui/icons-material/Backpack";
import PrecisionManufacturingIcon from "@mui/icons-material/PrecisionManufacturing";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import RefreshIcon from "@mui/icons-material/Refresh";

// Utility function for debouncing
const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

const Dispatch = () => {
  const theme = useTheme();
  const isSmall = useMediaQuery(theme.breakpoints.down("sm"));

  // Error Dialog States
  const [errorDialogOpen, setErrorDialogOpen] = useState(false);
  const [errorDialogData, setErrorDialogData] = useState({
    title: "Error",
    message: "",
    type: "error",
  });

  // Duplicate Serial Number Prevention State
  const [scannedSerialNumbers, setScannedSerialNumbers] = useState(new Set());

  // Function to show error dialog
  const showErrorDialog = (message, title = "Error", type = "error") => {
    setErrorDialogData({
      title,
      message,
      type,
    });
    setErrorDialogOpen(true);
  };

  // Function to close error dialog
  const closeErrorDialog = () => {
    setErrorDialogOpen(false);
    setErrorDialogData({
      title: "Error",
      message: "",
      type: "error",
    });
  };

  // Duplicate Serial Number Helper Functions
  const checkDuplicateSerialNumber = (serialNumber, partNumber) => {
    const serialKey = `${partNumber}_${serialNumber}`;

    if (scannedSerialNumbers.has(serialKey)) {
      return {
        isDuplicate: true,
        message: `Serial number "${serialNumber}" has already been scanned for part "${partNumber}".\n\nThis part has already been processed in the current session.\n\nPlease scan a different part or check your inventory.`,
      };
    }

    return {
      isDuplicate: false,
      message: "",
    };
  };

  const addScannedSerialNumber = (serialNumber, partNumber) => {
    const serialKey = `${partNumber}_${serialNumber}`;
    setScannedSerialNumbers((prev) => new Set([...prev, serialKey]));
    console.log(`Added scanned serial: ${serialKey}`);
  };

  const clearScannedSerialNumbers = () => {
    setScannedSerialNumbers(new Set());
    console.log("Cleared scanned serial numbers for new bin/invoice");
  };

  // Part name mapping
  const getPartNameByPartNo = (partNo) => {
    const partNameMapping = {
      "31100M52T03": "YTB/YED",
      "31100M55T04": "YTA/YTB",
      "31100M74T03": "YTB K10",
      "31100M75TA2": "YED HB",
      "31100M72R03": "YTA",
    };

    return partNameMapping[partNo] || "Unknown Part";
  };

  // State variables
  const [invoices, setInvoices] = useState([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [selectedInvoiceNo, setSelectedInvoiceNo] = useState("");

  const [invoicePartDetails, setInvoicePartDetails] = useState({
    partNo: "",
    partName: "",
    quantity: "",
    originalQuantity: "",
    packageCount: 0,
  });
  const [binPartDetails, setBinPartDetails] = useState({
    partNo: "",
    partName: "",
    quantity: "",
    originalQuantity: "",
  });
  const [partScanDetails, setPartScanDetails] = useState({
    partNo: "",
    serialNo: "",
  });
  const [scanQuantity, setScanQuantity] = useState("");
  const [scannedQuantity, setScannedQuantity] = useState(0);
  const [status, setStatus] = useState("⚠️ processing");
  const [totalPartCount, setTotalPartCount] = useState(0);
  const [totalPackageCount, setTotalPackageCount] = useState(0);
  const [scannedPartsCount, setScannedPartsCount] = useState(0);
  const [remainingTotalQuantity, setRemainingTotalQuantity] = useState(0);
  const [remainingBinQuantity, setRemainingBinQuantity] = useState(0);
  const [previousScanQuantity, setPreviousScanQuantity] = useState("");
  const [trackingRefresh, setTrackingRefresh] = useState(0);
  const [binQuantity, setBinQuantity] = useState("");
  const [machineBarcode, setMachineBarcode] = useState("");
  const [mismatchDialogOpen, setMismatchDialogOpen] = useState(false);
  const [mismatchMessage, setMismatchMessage] = useState("");
  const [currentBinTag, setCurrentBinTag] = useState("");
  const [progress, setProgress] = useState(0);
  const [completionDialogOpen, setCompletionDialogOpen] = useState(false);
  const [completionDialogData, setCompletionDialogData] = useState({
    binNo: "",
    invoiceNo: "",
    partNo: "",
    totalQuantity: 0,
    scannedQuantity: 0,
  });

  // Bin tracking states
  const [totalBinCount, setTotalBinCount] = useState(0);
  const [completedBinCount, setCompletedBinCount] = useState(0);
  const [invoiceProgress, setInvoiceProgress] = useState({
    totalQuantity: 0,
    scannedQuantity: 0,
    totalBins: 0,
    completedBins: 0,
    remainingQuantity: 0,
    binSize: 0,
  });
  const [allBinsCompletedDialogOpen, setAllBinsCompletedDialogOpen] =
    useState(false);

  const [sessionId] = useState(
    () => `SESSION_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  );

  // Refs
  const scanQuantityRef = useRef(null);
  const machineBarcodeRef = useRef(null);

  // =============================================================================
  // STATISTICS STORAGE FUNCTIONS
  // =============================================================================

  // Function to save statistics data to backend
  const saveStatisticsData = async (statisticsData) => {
    try {
      console.log("Saving statistics data:", {
        ...statisticsData,
        timestamp: new Date().toISOString(),
      });

      const response = await api.post("/api/statistics", {
        invoiceNumber: statisticsData.invoiceNumber,
        invoiceRemaining: statisticsData.invoiceRemaining,
        binQuantity: statisticsData.binQuantity,
        scannedPartCount: statisticsData.scannedPartCount,
        binProgress: statisticsData.binProgress,
        currentBinTag: statisticsData.currentBinTag,
        totalBinCount: statisticsData.totalBinCount,
        completedBinCount: statisticsData.completedBinCount,
        partNumber: statisticsData.partNumber,
        partName: statisticsData.partName,
        sessionId: sessionId,
        timestamp: new Date().toISOString(),
        status: statisticsData.status,
        originalInvoiceQuantity: statisticsData.originalInvoiceQuantity,
        currentBinProgress: statisticsData.currentBinProgress,
        overallProgress: statisticsData.overallProgress,
        remainingBinQuantity: statisticsData.remainingBinQuantity,
        currentBinScannedQuantity: statisticsData.currentBinScannedQuantity,
        isRefresh: statisticsData.isRefresh || false,
        refreshTimestamp: statisticsData.refreshTimestamp,
        lastUpdated: statisticsData.lastUpdated,
      });

      if (response.data.success) {
        console.log("Statistics saved successfully:", response.data.data);
        return response.data.data;
      } else {
        throw new Error(response.data.message || "Failed to save statistics");
      }
    } catch (error) {
      console.error("Error saving statistics:", error);
      if (error.response?.status !== 409) {
        console.error(
          "Statistics save failed:",
          error.response?.data?.message || error.message
        );
      }
      return null;
    }
  };

  // ENHANCED: Function to collect current statistics data with real-time calculations
  const collectStatisticsData = () => {
    const originalQuantity = parseInt(invoicePartDetails.originalQuantity) || 0;
    const currentBinProgressPercent = binPartDetails.quantity
      ? Math.round((scannedQuantity / parseInt(binPartDetails.quantity)) * 100)
      : 0;

    const overallProgressPercent =
      totalBinCount > 0
        ? Math.round((completedBinCount / totalBinCount) * 100)
        : originalQuantity > 0
        ? Math.round((scannedPartsCount / originalQuantity) * 100)
        : 0;

    // Real-time calculation of remaining quantity
    const realTimeRemaining = Math.max(0, originalQuantity - scannedPartsCount);

    return {
      invoiceNumber: selectedInvoiceNo,
      invoiceRemaining: realTimeRemaining,
      binQuantity: parseInt(binPartDetails.originalQuantity) || 0,
      scannedPartCount: scannedPartsCount,
      binProgress:
        totalBinCount > 0
          ? `${completedBinCount}/${totalBinCount}`
          : binPartDetails.quantity
          ? `${scannedQuantity}/${binPartDetails.quantity}`
          : "0/0",
      currentBinTag: currentBinTag,
      totalBinCount: totalBinCount,
      completedBinCount: completedBinCount,
      partNumber: invoicePartDetails.partNo,
      partName: invoicePartDetails.partName,
      status: status,
      originalInvoiceQuantity: originalQuantity,
      currentBinProgress: currentBinProgressPercent,
      overallProgress: overallProgressPercent,
      remainingBinQuantity: remainingBinQuantity,
      currentBinScannedQuantity: scannedQuantity,
      lastUpdated: new Date().toISOString(),
      sessionId: sessionId,
      statisticsTimestamp: Date.now(),
      calculationMethod: "realtime",
    };
  };

  // Function to save statistics with debouncing
  const debouncedSaveStatistics = useCallback(
    debounce(async () => {
      if (selectedInvoiceNo && invoicePartDetails.partNo) {
        const statisticsData = collectStatisticsData();
        await saveStatisticsData(statisticsData);
      }
    }, 2000),
    [
      selectedInvoiceNo,
      remainingTotalQuantity,
      binPartDetails,
      scannedPartsCount,
      totalBinCount,
      completedBinCount,
      currentBinTag,
      status,
      scannedQuantity,
      remainingBinQuantity,
      invoicePartDetails,
    ]
  );

  // Function to manually save statistics
  const saveCurrentStatistics = async () => {
    if (selectedInvoiceNo && invoicePartDetails.partNo) {
      const statisticsData = collectStatisticsData();
      const result = await saveStatisticsData(statisticsData);

      if (result) {
        console.log("Statistics saved manually");
        return result;
      } else {
        console.log("Failed to save statistics manually");
        return null;
      }
    }
  };

  // ENHANCED: Real-time statistics updates
  useEffect(() => {
    // Update remaining quantity whenever scanned parts count changes
    if (invoicePartDetails.originalQuantity) {
      const originalQty = parseInt(invoicePartDetails.originalQuantity);
      const newRemaining = Math.max(0, originalQty - scannedPartsCount);

      if (newRemaining !== remainingTotalQuantity) {
        console.log("Auto-updating remaining quantity:", {
          original: originalQty,
          scanned: scannedPartsCount,
          newRemaining,
          previousRemaining: remainingTotalQuantity,
        });
        setRemainingTotalQuantity(newRemaining);
      }
    }
  }, [scannedPartsCount, invoicePartDetails.originalQuantity]);

  // ENHANCED: Progress synchronization
  useEffect(() => {
    // Sync invoice progress state with individual state variables
    const shouldUpdate =
      invoiceProgress.scannedQuantity !== scannedPartsCount ||
      invoiceProgress.completedBins !== completedBinCount ||
      invoiceProgress.totalBins !== totalBinCount;

    if (shouldUpdate && invoicePartDetails.originalQuantity) {
      const originalQty = parseInt(invoicePartDetails.originalQuantity);
      const updatedProgress = {
        totalQuantity: originalQty,
        scannedQuantity: scannedPartsCount,
        totalBins: totalBinCount,
        completedBins: completedBinCount,
        remainingQuantity: Math.max(0, originalQty - scannedPartsCount),
        binSize: invoiceProgress.binSize,
      };

      console.log("Syncing invoice progress:", updatedProgress);
      setInvoiceProgress(updatedProgress);
    }
  }, [
    scannedPartsCount,
    completedBinCount,
    totalBinCount,
    invoicePartDetails.originalQuantity,
  ]);

  // Auto-save statistics when data changes
  useEffect(() => {
    debouncedSaveStatistics();
  }, [
    selectedInvoiceNo,
    remainingTotalQuantity,
    binPartDetails.originalQuantity,
    scannedPartsCount,
    totalBinCount,
    completedBinCount,
    scannedQuantity,
    status,
    currentBinTag,
    trackingRefresh,
  ]);

  // Function to fetch saved statistics
  const fetchSavedStatistics = async (invoiceNumber) => {
    try {
      const response = await api.get(
        `/api/statistics/${invoiceNumber}?sessionId=${sessionId}`
      );

      if (response.data.success && response.data.data) {
        const stats = response.data.data;
        console.log("Fetched saved statistics:", stats);
        return stats;
      } else {
        return null;
      }
    } catch (error) {
      if (error.response?.status !== 404) {
        console.error("Error fetching saved statistics:", error);
      }
      return null;
    }
  };

  // Function to save invoice progress to backend
  const saveInvoiceProgress = async (progressData) => {
    try {
      const response = await api.post("/api/invoice-progress", {
        invoiceNumber: selectedInvoiceNo,
        totalQuantity: progressData.totalQuantity,
        scannedQuantity: progressData.scannedQuantity,
        totalBins: progressData.totalBins,
        completedBins: progressData.completedBins,
        remainingQuantity: progressData.remainingQuantity,
        binSize: progressData.binSize,
        partNumber: invoicePartDetails.partNo,
        sessionId: sessionId,
        timestamp: new Date().toISOString(),
        status:
          progressData.completedBins >= progressData.totalBins
            ? "completed"
            : "in_progress",
      });

      if (response.data.success) {
        console.log("Invoice progress saved successfully");
        return response.data.data;
      } else {
        throw new Error(
          response.data.message || "Failed to save invoice progress"
        );
      }
    } catch (error) {
      console.error("Error saving invoice progress:", error);
      return null;
    }
  };

  // Function to fetch saved invoice progress
  const fetchInvoiceProgress = async (invoiceNumber) => {
    try {
      const response = await api.get(`/api/invoice-progress/${invoiceNumber}`);

      if (response.data.success && response.data.data) {
        const progressData = response.data.data;

        setInvoiceProgress({
          totalQuantity: progressData.totalQuantity,
          scannedQuantity: progressData.scannedQuantity,
          totalBins: progressData.totalBins,
          completedBins: progressData.completedBins,
          remainingQuantity: progressData.remainingQuantity,
          binSize: progressData.binSize,
        });

        setTotalBinCount(progressData.totalBins);
        setCompletedBinCount(progressData.completedBins);
        setScannedPartsCount(progressData.scannedQuantity);
        setRemainingTotalQuantity(progressData.remainingQuantity);

        console.log("Progress restored:", progressData);
        return progressData;
      } else {
        return null;
      }
    } catch (error) {
      if (error.response?.status !== 404) {
        console.error("Error fetching invoice progress:", error);
      }
      return null;
    }
  };

  // ENHANCED: Function to reset invoice progress
  const resetInvoiceProgress = (totalQuantity = 0) => {
    setInvoicePartDetails((prev) => ({
      ...prev,
      quantity: totalQuantity.toString(),
      originalQuantity: totalQuantity.toString(),
      packageCount: 0,
    }));
    setRemainingTotalQuantity(totalQuantity);
    setScannedPartsCount(0);
    setCompletedBinCount(0);
    setTotalBinCount(0);
    setInvoiceProgress({
      totalQuantity: totalQuantity,
      scannedQuantity: 0,
      totalBins: 0,
      completedBins: 0,
      remainingQuantity: totalQuantity,
      binSize: 0,
    });
  };

  // ENHANCED: Function to update bin progress when a bin is completed
  const onBinCompleted = async () => {
    const binQuantity = parseInt(binPartDetails.quantity) || 0;
    const newCompletedBins = completedBinCount + 1;
    const newScannedParts = scannedPartsCount + binQuantity;
    const originalQuantity = parseInt(invoicePartDetails.originalQuantity) || 0;
    const newRemaining = Math.max(0, originalQuantity - newScannedParts);

    console.log("Bin completion - updating statistics:", {
      binQuantity,
      newCompletedBins,
      newScannedParts,
      originalQuantity,
      newRemaining,
      totalBinCount,
    });

    // Update all states atomically
    setCompletedBinCount(newCompletedBins);
    setScannedPartsCount(newScannedParts);
    setRemainingTotalQuantity(newRemaining);

    // Update invoice progress
    const updatedProgress = {
      totalQuantity: originalQuantity,
      scannedQuantity: newScannedParts,
      totalBins: totalBinCount,
      completedBins: newCompletedBins,
      remainingQuantity: newRemaining,
      binSize: binQuantity,
    };
    setInvoiceProgress(updatedProgress);

    // Save progress to backend
    try {
      await saveInvoiceProgress(updatedProgress);
      console.log("Invoice progress saved successfully");
    } catch (error) {
      console.error("Failed to save invoice progress:", error);
    }

    // Save statistics
    try {
      await saveCurrentStatistics();
      console.log("Statistics saved after bin completion");
    } catch (error) {
      console.error("Failed to save statistics after bin completion:", error);
    }

    // Check if all bins are completed
    if (newCompletedBins >= totalBinCount && totalBinCount > 0) {
      toast.success(
        `🎉 Invoice ${selectedInvoiceNo} completed! All ${totalBinCount} bins processed successfully!`
      );
      setAllBinsCompletedDialogOpen(true);
    } else {
      const progressPercent =
        totalBinCount > 0
          ? Math.round((newCompletedBins / totalBinCount) * 100)
          : 0;
      toast.success(
        `Bin completed! Progress: ${newCompletedBins}/${totalBinCount} bins (${progressPercent}%) | Parts: ${newScannedParts}/${originalQuantity}`
      );
    }
  };

  // ENHANCED: Fetch invoice details with proper progress restoration
  const fetchInvoiceDetails = async (invoiceNumber) => {
    try {
      console.log(`Fetching details for invoice: ${invoiceNumber}`);

      const response = await api.get(
        `/api/scan/data/search?invoiceNumber=${invoiceNumber}`
      );

      if (response.data.success && response.data.data.length > 0) {
        const invoiceData = response.data.data[0];
        const originalQuantity = parseInt(invoiceData.quantity) || 0;
        const partNo = invoiceData.partNumber || "";
        const partName = getPartNameByPartNo(partNo);

        // Set invoice details
        setInvoicePartDetails({
          partNo: partNo,
          partName: partName,
          quantity: originalQuantity.toString(),
          originalQuantity: originalQuantity.toString(),
          packageCount: 0,
        });

        // First, try to restore saved progress
        console.log("Attempting to restore saved progress...");
        const savedProgress = await fetchInvoiceProgress(invoiceNumber);
        const savedStats = await fetchSavedStatistics(invoiceNumber);

        if (savedProgress || savedStats) {
          // Restore from saved data
          const progressData = savedProgress || {};
          const statsData = savedStats || {};

          const restoredScannedParts =
            progressData.scannedQuantity || statsData.scannedPartCount || 0;
          const restoredCompletedBins =
            progressData.completedBins || statsData.completedBinCount || 0;
          const restoredTotalBins =
            progressData.totalBins || statsData.totalBinCount || 0;
          const restoredRemaining = Math.max(
            0,
            originalQuantity - restoredScannedParts
          );

          // Update all related states
          setScannedPartsCount(restoredScannedParts);
          setCompletedBinCount(restoredCompletedBins);
          setTotalBinCount(restoredTotalBins);
          setRemainingTotalQuantity(restoredRemaining);

          setInvoiceProgress({
            totalQuantity: originalQuantity,
            scannedQuantity: restoredScannedParts,
            totalBins: restoredTotalBins,
            completedBins: restoredCompletedBins,
            remainingQuantity: restoredRemaining,
            binSize: progressData.binSize || 0,
          });

          console.log("Progress restored:", {
            scannedParts: restoredScannedParts,
            completedBins: restoredCompletedBins,
            totalBins: restoredTotalBins,
            remaining: restoredRemaining,
          });

          toast.success(
            `Invoice ${invoiceNumber} restored! Progress: ${restoredCompletedBins}/${restoredTotalBins} bins, ${restoredScannedParts}/${originalQuantity} parts`
          );
        } else {
          // No saved progress - start fresh
          console.log("No saved progress found - starting fresh");
          resetInvoiceProgress(originalQuantity);

          toast.success(
            `Invoice ${invoiceNumber} loaded! Part: ${partName} (${originalQuantity} total)`
          );
        }

        // Fetch package count
        if (partNo) {
          await fetchPartPackageCount(partNo);
        }

        // Save/update statistics after loading
        setTimeout(async () => {
          await saveCurrentStatistics();
        }, 500);
      } else {
        throw new Error("No data found for this invoice");
      }
    } catch (error) {
      console.error("Error fetching invoice details:", error);
      showErrorDialog(
        "Failed to fetch invoice details: " +
          (error.response?.data?.message || error.message),
        "Invoice Details Error",
        "error"
      );

      // Reset states on error
      resetInvoiceProgress(0);
    }
  };

  // Manual refresh function
  const manualRefreshStatistics = async () => {
    if (selectedInvoiceNo) {
      await fetchInvoiceDetails(selectedInvoiceNo);
      toast.success("Statistics manually refreshed!");
    } else {
      toast.error("No invoice selected to refresh");
    }
  };

  // Validation helper function
  const validatePartNumberMatch = () => {
    const invoicePartNo = invoicePartDetails.partNo?.trim();
    const binPartNo = binPartDetails.partNo?.trim();

    if (!invoicePartNo || !binPartNo) {
      return {
        isValid: false,
        message: "Both invoice and bin part numbers must be set",
      };
    }

    if (invoicePartNo !== binPartNo) {
      return {
        isValid: false,
        message: `Part number mismatch! Invoice: ${invoicePartNo}, Bin: ${binPartNo}`,
      };
    }

    return { isValid: true, message: "Part numbers match" };
  };

  // Check if machine scanner should be disabled
  const isMachineScannerDisabled = () => {
    return (
      !selectedInvoiceNo ||
      !invoicePartDetails.partNo ||
      !binPartDetails.partNo ||
      invoicePartDetails.partNo.trim() !== binPartDetails.partNo.trim()
    );
  };

  // Get helper text for machine scanner
  const getMachineScannerHelperText = () => {
    if (!selectedInvoiceNo) return "Select invoice first";
    if (!invoicePartDetails.partNo) return "Load invoice details first";
    if (!binPartDetails.partNo) return "Scan bin QR code first";
    if (invoicePartDetails.partNo.trim() !== binPartDetails.partNo.trim()) {
      return "Part numbers don't match - scan correct bin";
    }
    return "Ready to scan parts";
  };

  // Store raw scan data
  const storeRawScanData = async (rawData) => {
    try {
      const response = await api.post("/api/raw-scans", {
        rawData: rawData,
        invoiceNumber: selectedInvoiceNo,
        sessionId: sessionId,
        timestamp: new Date().toISOString(),
      });

      if (response.data.success) {
        console.log(
          "Raw scan data stored successfully:",
          response.data.data.id
        );
        return response.data.data;
      } else {
        throw new Error(
          response.data.message || "Failed to store raw scan data"
        );
      }
    } catch (error) {
      console.error("Error storing raw scan data:", error);
      throw error;
    }
  };

  // Function to save part scanning data
  const savePartScanData = async (scanData) => {
    try {
      const response = await api.post("/api/partScan", {
        partNumber: scanData.partNumber,
        shift: scanData.shift,
        serialNumber: scanData.serialNumber,
        date: scanData.date,
        binNumber: scanData.binNumber,
        invoiceNumber: scanData.invoiceNumber,
        scanTimestamp: scanData.scanTimestamp || new Date().toISOString(),
        scanStatus: scanData.scanStatus,
        rawBarcodeData: scanData.rawBarcodeData,
        sessionId: sessionId,
        totalQuantity: binPartDetails.quantity,
      });

      if (response.data.success) {
        console.log("Part scan data saved successfully:", response.data.data);
        return response.data.data;
      } else {
        throw new Error(
          response.data.message || "Failed to save part scan data"
        );
      }
    } catch (error) {
      console.error("Error saving part scan data:", error);
      if (error.response?.status !== 409) {
        console.error(
          "Part scan storage error:",
          error.response?.data?.message || error.message
        );
      }
      throw error;
    }
  };

  // Parse concatenated barcode format
  const parseConcatenatedBarcode = (concatenatedText) => {
    try {
      const cleanedText = concatenatedText.trim();

      if (cleanedText.length < 25) {
        throw new Error(`Barcode too short: ${cleanedText.length} characters`);
      }

      let pos = 0;
      const vendorCode = cleanedText.substring(pos, pos + 4);
      pos += 4;
      const shift = cleanedText.substring(pos, pos + 1);
      pos += 1;
      const partNumber = cleanedText.substring(5, 16);
      pos = 16;
      const date = cleanedText.substring(pos, pos + 6);
      pos += 6;
      const remaining = cleanedText.substring(pos);
      const serial = remaining.slice(-4);
      const quantityPart = remaining.slice(0, -4);
      const quantity = quantityPart || "1";

      if (!/^[A-Z]\d{3}$/.test(vendorCode)) {
        throw new Error(`Invalid vendor code: ${vendorCode}`);
      }
      if (!/^\d$/.test(shift)) {
        throw new Error(`Invalid shift: ${shift}`);
      }
      if (partNumber.length !== 11) {
        throw new Error(
          `Invalid part number length: ${partNumber} (expected 11 characters)`
        );
      }
      if (!/^\d{6}$/.test(date)) {
        throw new Error(`Invalid date format: ${date}`);
      }
      if (serial.length !== 4 || !/^\d{4}$/.test(serial)) {
        throw new Error(`Invalid serial number: ${serial} (expected 4 digits)`);
      }

      const spacedFormat = `${vendorCode} ${shift} ${partNumber} ${date} ${quantity} ${serial}`;

      return {
        vendorCode,
        shift,
        partNumber,
        date,
        quantity,
        serial,
        spacedFormat,
        original: concatenatedText,
      };
    } catch (error) {
      console.error("Concatenated barcode parsing error:", error);
      throw error;
    }
  };

  // Extract part number from various barcode formats
  const extractPartNumberFromBarcode = (barcodeText) => {
    try {
      const cleanedText = barcodeText.trim();

      // Method 1: Full spaced format parsing
      if (cleanedText.includes(" ")) {
        const parts = cleanedText.split(/\s+/);
        if (parts.length >= 3) {
          const partNumber = parts[2];
          if (partNumber.length === 11) {
            return partNumber;
          }
        }
      }

      // Method 2: Concatenated format parsing
      if (cleanedText.length >= 25 && /^[A-Z]\d{3}\d/.test(cleanedText)) {
        try {
          const partNumber = cleanedText.substring(5, 16);
          if (partNumber.length === 11) {
            return partNumber;
          }
        } catch (parseError) {
          console.log("Position-based extraction failed:", parseError.message);
        }
      }

      // Method 3: Pattern matching for 11-character part numbers
      const patterns = [
        /(\d{5}[A-Z]\d{2}[A-Z]\d{2})/i,
        /([0-9]{5}[A-Z][0-9]{2}[A-Z][0-9]{2})/i,
        /(\d{5}[A-Z0-9]{6})/i,
      ];

      for (let i = 0; i < patterns.length; i++) {
        const pattern = patterns[i];
        const matches = cleanedText.match(pattern);
        if (matches) {
          for (const match of matches) {
            if (match && match.length === 11) {
              return match;
            }
          }
        }
      }

      throw new Error(`Unable to extract part number from: ${cleanedText}`);
    } catch (error) {
      console.error("Part number extraction error:", error);
      throw error;
    }
  };

  // Parse machine barcode data
  const parseMachineBarcode = (barcodeText) => {
    try {
      const cleanedText = barcodeText.trim();

      // Check if this is a concatenated format
      if (
        cleanedText.length >= 25 &&
        /^[A-Z]\d{3}\d/.test(cleanedText) &&
        !cleanedText.includes(" ")
      ) {
        try {
          const parsed = parseConcatenatedBarcode(cleanedText);
          return {
            vendorCode: parsed.vendorCode,
            staticshift: parsed.shift,
            partNumber: parsed.partNumber,
            date: parsed.date,
            quantity: parseInt(parsed.quantity) || 1,
            Serial_no: parsed.serial,
            rawBarcodeData: barcodeText,
            spacedFormat: parsed.spacedFormat,
            invoiceNumber: selectedInvoiceNo,
            binNumber: currentBinTag,
            timestamp: new Date().toISOString(),
          };
        } catch (parseError) {
          console.log(
            "Concatenated parsing failed, trying other methods:",
            parseError.message
          );
        }
      }

      // Try to extract part number using enhanced extraction
      const partNumber = extractPartNumberFromBarcode(cleanedText);

      // For spaced formats, try to parse other components
      let vendorCode = "";
      let shift = "";
      let date = "";
      let quantity = 1;
      let serialNo = "";

      if (cleanedText.includes(" ")) {
        const parts = cleanedText.split(/\s+/);
        if (parts.length >= 5) {
          vendorCode = parts[0];
          shift = parts[1];
          date = parts[3];
          quantity = parseInt(parts[4]) || 1;
          if (parts.length > 5) {
            serialNo = parts.slice(5).join("");
          }
        }
      } else {
        const vendorMatch = cleanedText.match(/^([A-Z]\d{2,4})/);
        vendorCode = vendorMatch ? vendorMatch[1] : "UNKNOWN";

        const shiftMatch = cleanedText.match(/^[A-Z]\d{3}(\d)/);
        shift = shiftMatch ? shiftMatch[1] : "1";

        const dateMatch = cleanedText.match(/(\d{6})/);
        date = dateMatch
          ? dateMatch[1]
          : new Date()
              .toLocaleDateString("en-GB", {
                day: "2-digit",
                month: "2-digit",
                year: "2-digit",
              })
              .replace(/\//g, "");

        const last4Digits = cleanedText.match(/(\d{4})$/);
        serialNo = last4Digits
          ? last4Digits[1]
          : Math.floor(Math.random() * 10000)
              .toString()
              .padStart(4, "0");
      }

      return {
        vendorCode,
        staticshift: shift,
        partNumber,
        date,
        quantity,
        Serial_no: serialNo,
        rawBarcodeData: barcodeText,
        invoiceNumber: selectedInvoiceNo,
        binNumber: currentBinTag,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error("Machine Barcode Parsing Error:", error);
      throw new Error(`Failed to parse machine barcode: ${error.message}`);
    }
  };

  const saveMachineScanData = async (parsedData) => {
    try {
      const response = await api.post("/api/machineScan", {
        vendorCode: parsedData.vendorCode,
        date: parsedData.date,
        partNumber: parsedData.partNumber,
        Serial_no: parsedData.Serial_no,
        staticshift: parsedData.staticshift,
        invoiceNumber: selectedInvoiceNo,
        binNumber: currentBinTag,
        totalQuantity: binPartDetails.quantity,
        timestamp: new Date().toISOString(),
        sessionId: sessionId,
      });

      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(
          response.data.message || "Failed to save machine scan data"
        );
      }
    } catch (error) {
      console.error("Error saving machine scan data:", error);
      if (error.response?.status === 409) {
        return error.response.data.data;
      }
      throw error;
    }
  };

  // QR Code parsing functions
  const parseQRCodeData = (qrCodeText) => {
    try {
      const cleanedText = qrCodeText.trim();
      const lines = cleanedText
        .split(/\r?\n/)
        .filter((line) => line.trim().length > 0);

      // Try line-by-line parsing first
      if (lines.length >= 4) {
        try {
          return parseQRByLines(lines, cleanedText);
        } catch (lineParseError) {
          console.log("Line-by-line parsing failed:", lineParseError.message);
        }
      }

      // Try compressed format parsing
      try {
        return parseQRCompressedFormat(cleanedText);
      } catch (compressedParseError) {
        console.log(
          "Compressed format parsing failed:",
          compressedParseError.message
        );
      }

      // Try regex-based extraction
      try {
        return parseQRWithRegex(cleanedText);
      } catch (regexParseError) {
        console.log("Regex parsing failed:", regexParseError.message);
      }

      throw new Error("All parsing methods failed");
    } catch (error) {
      console.error("QR Parsing Error:", error);
      throw new Error(`Failed to parse QR code: ${error.message}`);
    }
  };

  const parseQRByLines = (lines, originalText) => {
    const binNoMatch = lines[0].trim().match(/(\d{13})/);
    if (!binNoMatch) {
      throw new Error(`Invalid bin number in line 1: ${lines[0]}`);
    }
    const binNo = binNoMatch[1];

    let partNumber = lines[1].trim().replace(/\s+/g, "");
    if (partNumber.length !== 11) {
      const partMatch = lines[1].match(/([A-Z0-9]{11})/);
      if (partMatch) {
        partNumber = partMatch[1];
      } else {
        throw new Error(
          `Invalid part number length: ${partNumber} (expected 11 characters)`
        );
      }
    }

    const quantityMatch = lines[2].trim().match(/(\d+)/);
    if (!quantityMatch) {
      throw new Error(`Invalid quantity in line 3: ${lines[2]}`);
    }
    const quantity = parseInt(quantityMatch[1]);

    let descriptionOrPartName = lines[3].trim().replace(/,$/, "").trim();
    if (!descriptionOrPartName) {
      throw new Error("Description is empty");
    }

    let date = "";
    let invoiceNumber = "";

    for (let i = 4; i < lines.length; i++) {
      const line = lines[i];
      const dateMatch = line.match(/(\d{2}\/\d{2}\/\d{2})/);
      if (dateMatch && !date) {
        date = dateMatch[1];
        const afterDate = line.substring(line.indexOf(date) + date.length);
        const invoiceMatch = afterDate
          .replace(/\s/g, "")
          .match(/([A-Z0-9]{10})/);
        if (invoiceMatch) {
          invoiceNumber = invoiceMatch[1];
        }
        break;
      }
    }

    if (!invoiceNumber) {
      invoiceNumber = selectedInvoiceNo || "UNKNOWN";
    }

    return {
      binNo,
      partNumber,
      quantity,
      descriptionOrPartName,
      date: date || new Date().toLocaleDateString("en-GB"),
      invoiceNumber,
      rawQRData: originalText,
      timestamp: new Date().toISOString(),
      sessionId: sessionId,
    };
  };

  const parseQRCompressedFormat = (cleanedText) => {
    const compressedText = cleanedText
      .replace(/\r?\n/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    const binNoMatch = compressedText.match(/^(\d{13})/);
    if (!binNoMatch) {
      throw new Error("Could not find bin number at start");
    }
    const binNo = binNoMatch[1];

    let remainingText = compressedText.substring(13).trim();
    const partNoMatch = remainingText.match(/^([A-Z0-9]{11})/);
    if (!partNoMatch) {
      throw new Error("Could not find part number after bin number");
    }
    const partNumber = partNoMatch[1];

    remainingText = remainingText.substring(11).trim();
    const quantityMatch = remainingText.match(/^(\d+)/);
    if (!quantityMatch) {
      throw new Error("Could not find quantity after part number");
    }
    const quantity = parseInt(quantityMatch[1]);

    remainingText = remainingText.substring(quantityMatch[1].length).trim();

    let descriptionOrPartName = "";
    const binRepeatIndex = remainingText.indexOf(binNo);
    const dateMatch = remainingText.match(/\d{2}\/\d{2}\/\d{2}/);

    let endIndex = remainingText.length;
    if (binRepeatIndex > 0) {
      endIndex = Math.min(endIndex, binRepeatIndex);
    }
    if (dateMatch && dateMatch.index > 0) {
      endIndex = Math.min(endIndex, dateMatch.index);
    }

    descriptionOrPartName = remainingText
      .substring(0, endIndex)
      .trim()
      .replace(/,$/, "")
      .trim();

    if (!descriptionOrPartName) {
      descriptionOrPartName = "MOTOR ASSY,STARTING";
    }

    let date = "";
    let invoiceNumber = "";

    if (dateMatch) {
      date = dateMatch[0];
      const afterDate = remainingText.substring(dateMatch.index + date.length);
      const invoiceMatch = afterDate.replace(/\s/g, "").match(/([A-Z0-9]{10})/);
      if (invoiceMatch) {
        invoiceNumber = invoiceMatch[1];
      }
    }

    if (!invoiceNumber) {
      invoiceNumber = selectedInvoiceNo || "UNKNOWN";
    }

    return {
      binNo,
      partNumber,
      quantity,
      descriptionOrPartName,
      date: date || new Date().toLocaleDateString("en-GB"),
      invoiceNumber,
      rawQRData: cleanedText,
      timestamp: new Date().toISOString(),
      sessionId: sessionId,
    };
  };

  const parseQRWithRegex = (cleanedText) => {
    const binNoMatch = cleanedText.match(/(\d{13})/);
    if (!binNoMatch) {
      throw new Error("Could not find 13-digit bin number");
    }
    const binNo = binNoMatch[1];

    const partMatches = cleanedText.match(/([A-Z0-9]{11})/g);
    if (!partMatches || partMatches.length === 0) {
      throw new Error("Could not find 11-character part number");
    }

    let partNumber = "";
    for (const match of partMatches) {
      if (
        match !== binNo.substring(0, 11) &&
        match !== binNo.substring(2, 13)
      ) {
        partNumber = match;
        break;
      }
    }

    if (!partNumber) {
      partNumber = partMatches[0];
    }

    const numberMatches = cleanedText.match(/\s(\d{1,3})\s/g);
    let quantity = 4;

    if (numberMatches) {
      for (const match of numberMatches) {
        const num = parseInt(match.trim());
        if (num > 0 && num <= 100) {
          quantity = num;
          break;
        }
      }
    }

    let descriptionOrPartName = "MOTOR ASSY,STARTING";
    const descriptionMatch = cleanedText.match(/MOTOR[^0-9]*/i);
    if (descriptionMatch) {
      descriptionOrPartName = descriptionMatch[0].trim();
    }

    const dateMatch = cleanedText.match(/(\d{2}\/\d{2}\/\d{2})/);
    const date = dateMatch
      ? dateMatch[1]
      : new Date().toLocaleDateString("en-GB");

    let invoiceNumber = selectedInvoiceNo || "UNKNOWN";
    const invoiceMatches = cleanedText.match(/([A-Z0-9]{10})/g);
    if (invoiceMatches) {
      for (const match of invoiceMatches) {
        if (
          match !== binNo.substring(0, 10) &&
          match !== partNumber.substring(0, 10)
        ) {
          invoiceNumber = match;
          break;
        }
      }
    }

    return {
      binNo,
      partNumber,
      quantity,
      descriptionOrPartName,
      date,
      invoiceNumber,
      rawQRData: cleanedText,
      timestamp: new Date().toISOString(),
      sessionId: sessionId,
    };
  };

  // Save bin data to database with validation
  const saveBinDataToDatabase = async (parsedData) => {
    try {
      if (!parsedData || typeof parsedData !== "object") {
        throw new Error("Invalid parsed data - not an object");
      }

      if (!parsedData.binNo || parsedData.binNo.length !== 13) {
        throw new Error(`Invalid bin number: ${parsedData.binNo}`);
      }

      if (!parsedData.partNumber || parsedData.partNumber.length !== 11) {
        throw new Error(`Invalid part number: ${parsedData.partNumber}`);
      }

      if (
        !parsedData.quantity ||
        isNaN(parsedData.quantity) ||
        parsedData.quantity <= 0
      ) {
        throw new Error(`Invalid quantity: ${parsedData.quantity}`);
      }

      // Frontend validation
      const selectedInvoice = selectedInvoiceNo?.trim();
      const binInvoice = parsedData.invoiceNumber?.trim();

      if (!selectedInvoice) {
        const error = "No invoice selected. Please select an invoice first.";
        showErrorDialog(error, "Invoice Selection Required", "warning");
        throw new Error(error);
      }

      if (!binInvoice || binInvoice === "UNKNOWN") {
        const error =
          "Cannot determine bin invoice number from QR code. Please check QR code format.";
        showErrorDialog(error, "QR Code Format Error", "error");
        throw new Error(error);
      }

      if (selectedInvoice !== binInvoice) {
        const error = `Invoice validation failed!\n\nSelected Invoice: ${selectedInvoice}\nBin Invoice: ${binInvoice}\n\nThis bin belongs to invoice ${binInvoice}, but you have selected invoice ${selectedInvoice}.\n\nPlease scan a bin that belongs to the selected invoice.`;
        showErrorDialog(error, "Invoice Validation Failed", "validation");
        throw new Error(
          `Invoice mismatch: Selected ${selectedInvoice} vs Bin ${binInvoice}`
        );
      }

      // Validate part numbers match
      const selectedPartNo = invoicePartDetails.partNo?.trim();
      const binPartNo = parsedData.partNumber?.trim();

      if (!selectedPartNo) {
        const error =
          "Invoice part number not loaded. Please reload invoice details.";
        showErrorDialog(error, "Part Number Loading Error", "warning");
        throw new Error(error);
      }

      if (selectedPartNo !== binPartNo) {
        const error = `Part number validation failed!\n\nInvoice Part: ${selectedPartNo}\nBin Part: ${binPartNo}\n\nThis bin contains different parts than required for this invoice.`;
        showErrorDialog(error, "Part Number Validation Failed", "validation");
        throw new Error(
          `Part number mismatch: Invoice ${selectedPartNo} vs Bin ${binPartNo}`
        );
      }

      const response = await api.post("/api/bindata/qr", {
        qrCodeData: parsedData.rawQRData,
        invoiceNumber: selectedInvoiceNo,
        sessionId: sessionId,
        timestamp: new Date().toISOString(),
        binNumber: parsedData.binNo,
        partNumber: parsedData.partNumber,
        totalQuantity: parsedData.quantity,
        description: parsedData.descriptionOrPartName,
        validatedInvoiceMatch: true,
        validatedPartMatch: true,
        validationTimestamp: new Date().toISOString(),
      });

      if (response.data.success) {
        toast.success(
          `✅ Bin validated and saved successfully!\nInvoice: ${selectedInvoice} | Part: ${selectedPartNo}`
        );
        const savedData = response.data.data;

        if (!savedData.quantity && parsedData.quantity) {
          savedData.quantity = parsedData.quantity;
        }
        if (!savedData.partNumber && parsedData.partNumber) {
          savedData.partNumber = parsedData.partNumber;
        }
        if (!savedData.binNo && parsedData.binNo) {
          savedData.binNo = parsedData.binNo;
        }

        return savedData;
      } else {
        throw new Error(response.data.message || "Failed to save bin data");
      }
    } catch (error) {
      console.error("Error saving bin data:", error);

      if (
        error.message.includes("mismatch") ||
        error.message.includes("validation failed")
      ) {
        throw error;
      }

      if (error.response?.status === 409) {
        const existingData = error.response.data.data;
        if (existingData && !existingData.quantity && parsedData.quantity) {
          existingData.quantity = parsedData.quantity;
        }
        return existingData;
      }

      if (error.response?.status === 400) {
        showErrorDialog(
          "QR Code format error: " + error.response.data.message,
          "QR Code Format Error",
          "error"
        );
      } else {
        showErrorDialog(
          "Failed to save bin data: " +
            (error.response?.data?.message || error.message),
          "Database Save Error",
          "error"
        );
      }

      throw error;
    }
  };

  // Fetch existing bin data
  const fetchExistingBinData = async (binNo) => {
    try {
      const response = await api.get(`/api/bindata/bin/${binNo}`);
      if (response.data.success) {
        return response.data.data;
      } else {
        return null;
      }
    } catch (error) {
      if (error.response?.status === 404) {
        return null;
      }
      console.error("Error fetching bin data:", error);
      throw error;
    }
  };

  // Create package in database
  const createPackageInDatabase = async (binNo) => {
    try {
      const response = await api.post("/api/bindata/create-package", {
        binNo: binNo,
        invoiceNumber: selectedInvoiceNo,
        sessionId: sessionId,
        timestamp: new Date().toISOString(),
      });

      if (response.data.success) {
        return response.data;
      } else {
        throw new Error(response.data.message || "Failed to create package");
      }
    } catch (error) {
      if (error.response?.status === 409) {
        toast.success("Package already exists for this bin");
        return error.response.data;
      }
      console.error("Error creating package:", error);
      throw error;
    }
  };

  // Update scan progress
  const updateScanProgress = async (binNo, scannedCount, scanDetails = {}) => {
    try {
      const response = await api.post("/api/bindata/scan-progress", {
        binNo: binNo,
        scannedQuantity: scannedCount,
        isValid: scanDetails.isValid !== false,
        mismatchReason: scanDetails.mismatchReason,
        machineData: scanDetails.machineData,
        invoiceNumber: selectedInvoiceNo,
        sessionId: sessionId,
        timestamp: new Date().toISOString(),
      });

      if (response.data.success) {
        return response.data;
      } else {
        throw new Error(
          response.data.message || "Failed to update scan progress"
        );
      }
    } catch (error) {
      console.error("Error updating scan progress:", error);
      throw error;
    }
  };

  // Get package count for a part number
  const fetchPartPackageCount = async (partNo) => {
    try {
      if (!partNo) return;

      const response = await api.get(
        `/api/packages?partNumber=${partNo}&limit=1000`
      );

      if (response.data.success) {
        const packageCount = response.data.data.length;
        setInvoicePartDetails((prev) => ({
          ...prev,
          packageCount: packageCount,
        }));
      }
    } catch (error) {
      console.error("Error fetching package count:", error);
      setInvoicePartDetails((prev) => ({
        ...prev,
        packageCount: 0,
      }));
    }
  };

  // Fetch invoices from API
  const fetchInvoices = async () => {
    try {
      setLoadingInvoices(true);
      const response = await api.get("/api/scan/data");

      if (response.data.success) {
        const uniqueInvoices = [
          ...new Set(response.data.data.map((item) => item.invoiceNumber)),
        ]
          .filter((invoiceNo) => invoiceNo && invoiceNo.trim() !== "")
          .map((invoiceNo) => ({ invoiceNumber: invoiceNo }));

        setInvoices(uniqueInvoices);
      } else {
        throw new Error(response.data.message || "Failed to fetch invoices");
      }
    } catch (error) {
      console.error("Error fetching invoices:", error);
      showErrorDialog(
        "Failed to fetch invoices: " +
          (error.response?.data?.message || error.message),
        "Invoice Fetch Error",
        "error"
      );
      setInvoices([]);
    } finally {
      setLoadingInvoices(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  useEffect(() => {
    if (binPartDetails.partNo && scanQuantityRef.current) {
      scanQuantityRef.current.focus();
    }
  }, [binPartDetails.partNo]);

  // Save package data function
  const savePackageData = async () => {
    try {
      const packageResponse = await createPackageInDatabase(currentBinTag);

      if (packageResponse.success) {
        toast.success(
          `Package ${packageResponse.packageNo} created successfully`
        );
        await fetchPartPackageCount(binPartDetails.partNo);
        return packageResponse.data;
      }
    } catch (error) {
      console.error("Error saving package data:", error);
      showErrorDialog(
        "Failed to save package data",
        "Package Save Error",
        "error"
      );
      return null;
    }
  };

  // Update total counts
  const updateCounts = async () => {
    try {
      console.log("Current session counts:", {
        totalPartCount,
        totalPackageCount,
        sessionId,
      });
    } catch (error) {
      console.error("Error saving counts:", error);
    }
  };

  useEffect(() => {
    if (totalPartCount !== 0 || totalPackageCount !== 0) {
      updateCounts();
    }
  }, [totalPartCount, totalPackageCount]);

  useEffect(() => {
    setTotalPartCount(0);
    setTotalPackageCount(0);
  }, []);

  // ENHANCED: Handle invoice change with proper state management
  const handleInvoiceChange = async (e) => {
    const value = e.target.value;
    const previousInvoice = selectedInvoiceNo;

    setSelectedInvoiceNo(value);

    if (value) {
      // Clear scanned serial numbers when switching invoices
      clearScannedSerialNumbers();

      // Always fetch fresh invoice details and update statistics
      await fetchInvoiceDetails(value);

      // If the same invoice is selected again, force refresh
      if (previousInvoice === value) {
        console.log(
          `Same invoice ${value} selected again - refreshing statistics`
        );
        setTimeout(async () => {
          await manualRefreshStatistics();
        }, 1000);
        toast.success(`Invoice ${value} statistics refreshed!`);
      }
    } else {
      resetAllStates();
    }
  };

  // Reset all states function
  const resetAllStates = () => {
    setInvoicePartDetails({
      partNo: "",
      partName: "",
      quantity: "",
      originalQuantity: "",
      packageCount: 0,
    });
    setRemainingTotalQuantity(0);
    setScannedPartsCount(0);
    setScannedQuantity(0);
    setScanQuantity("");
    setMachineBarcode("");
    setStatus("⚠️ processing");
    setPreviousScanQuantity("");
    setBinPartDetails({
      partNo: "",
      partName: "",
      quantity: "",
      originalQuantity: "",
    });
    setPartScanDetails({
      partNo: "",
      serialNo: "",
    });
    setBinQuantity("");
    setCurrentBinTag("");
    setProgress(0);
    setRemainingBinQuantity(0);
    setTotalBinCount(0);
    setCompletedBinCount(0);
    setInvoiceProgress({
      totalQuantity: 0,
      scannedQuantity: 0,
      totalBins: 0,
      completedBins: 0,
      remainingQuantity: 0,
      binSize: 0,
    });
    clearScannedSerialNumbers();
  };

  // ENHANCED: QR Code processing with improved bin count calculation
  const handleScanQuantityChange = async (e) => {
    const value = e.target.value.trim();
    setScanQuantity(value);

    if (window.qrProcessingTimeout) {
      clearTimeout(window.qrProcessingTimeout);
    }

    const processQRCode = async (value) => {
      if (value && (value.includes("\n") || value.length > 50)) {
        try {
          if (!selectedInvoiceNo) {
            showErrorDialog(
              "Please select an invoice first!",
              "Invoice Required",
              "warning"
            );
            setScanQuantity("");
            return;
          }

          if (!invoicePartDetails.partNo) {
            showErrorDialog(
              "Invoice part number not loaded!",
              "Part Number Required",
              "warning"
            );
            setScanQuantity("");
            return;
          }

          const parsedData = parseQRCodeData(value);

          if (
            parsedData.partNumber.trim() !== invoicePartDetails.partNo.trim()
          ) {
            showErrorDialog(
              `Part number mismatch!\nInvoice Part: ${invoicePartDetails.partNo}\nBin Part: ${parsedData.partNumber}\n\nPlease scan the correct bin for this invoice.`,
              "Part Number Mismatch",
              "validation"
            );
            setScanQuantity("");
            return;
          }

          if (currentBinTag === parsedData.binNo) {
            toast.success("Same bin already loaded");
            setScanQuantity("");
            return;
          }

          const existingBinData = await fetchExistingBinData(parsedData.binNo);
          let savedBinData;

          if (existingBinData) {
            savedBinData = existingBinData;
            toast.success(
              `Loading existing bin: ${parsedData.binNo} (${
                existingBinData.scannedQuantity || 0
              }/${existingBinData.quantity} completed)`
            );
          } else {
            savedBinData = await saveBinDataToDatabase(parsedData);
            setScannedQuantity(0);
            setProgress(0);
          }

          const initialBinQuantity = savedBinData.quantity;
          const alreadyScanned = existingBinData?.scannedQuantity || 0;
          const remainingForThisBin = Math.max(
            0,
            initialBinQuantity - alreadyScanned
          );

          setBinPartDetails({
            partNo: savedBinData.partNumber,
            partName: savedBinData.descriptionOrPartName,
            quantity: savedBinData.quantity.toString(),
            originalQuantity: savedBinData.quantity.toString(),
          });
          setBinQuantity(savedBinData.quantity.toString());
          setCurrentBinTag(savedBinData.binNo);
          setRemainingBinQuantity(remainingForThisBin);
          setScannedQuantity(alreadyScanned);
          setProgress(Math.round((alreadyScanned / initialBinQuantity) * 100));

          // Clear scanned serial numbers when switching to new bin
          clearScannedSerialNumbers();

          // ENHANCED: Calculate and set bin count if not already set
          if (totalBinCount === 0 && invoicePartDetails.originalQuantity) {
            const totalQty = parseInt(invoicePartDetails.originalQuantity);
            const binSize = initialBinQuantity;
            const calculatedBinCount = Math.ceil(totalQty / binSize);

            console.log("Calculating total bin count:", {
              totalQty,
              binSize,
              calculatedBinCount,
            });

            setTotalBinCount(calculatedBinCount);

            // Update invoice progress with calculated bin count
            const currentProgress = {
              totalQuantity: totalQty,
              scannedQuantity: scannedPartsCount,
              totalBins: calculatedBinCount,
              completedBins: completedBinCount,
              remainingQuantity: remainingTotalQuantity,
              binSize: binSize,
            };
            setInvoiceProgress(currentProgress);

            // Save the updated progress
            await saveInvoiceProgress(currentProgress);

            toast.success(
              `Bin count calculated: ${calculatedBinCount} bins total (${binSize} parts per bin)`
            );
          }

          setPartScanDetails({ partNo: "", serialNo: "" });

          if (
            savedBinData.status === "completed" ||
            alreadyScanned >= initialBinQuantity
          ) {
            setStatus("✅ completed");
          } else {
            setStatus("⚠️ processing");
          }

          setScanQuantity("");

          // Save statistics after bin is loaded
          setTimeout(async () => {
            await saveCurrentStatistics();
          }, 500);

          setTimeout(() => {
            if (
              machineBarcodeRef.current &&
              savedBinData.status !== "completed"
            ) {
              machineBarcodeRef.current.focus();
            }
          }, 100);
        } catch (error) {
          console.error("Error processing QR code:", error);
          showErrorDialog(
            "Failed to process QR code: " + error.message,
            "QR Code Processing Error",
            "error"
          );
          setScanQuantity("");
        }
      }
    };

    if (!value || value.length < 20) return;

    window.qrProcessingTimeout = setTimeout(async () => {
      await processQRCode(value);
    }, 300);
  };

  // Machine barcode processing
  const handleMachineBarcodeChange = async (e) => {
    const rawValue = e.target.value;
    setMachineBarcode(rawValue);

    if (!rawValue) return;

    if (window.barcodeTimeout) {
      clearTimeout(window.barcodeTimeout);
    }

    window.barcodeTimeout = setTimeout(async () => {
      await processMachineBarcode(rawValue);
    }, 100);
  };

  // ENHANCED: Machine barcode processing with comprehensive validation
  const processMachineBarcode = async (rawValue) => {
    const trimmedValue = rawValue.trim();

    if (!trimmedValue || trimmedValue.length < 8) {
      return;
    }

    // Validate spaced format barcode
    if (trimmedValue.includes(" ")) {
      if (trimmedValue.length !== 32) {
        const errorMessage = `Invalid barcode format! Expected exactly 32 characters, but got ${trimmedValue.length} characters.\n\nScanned: "${trimmedValue}"\nExpected format: "L012 3 31100M55T04 290725 2 4231" (32 chars)`;

        showErrorDialog(
          errorMessage,
          "Barcode Format Validation Failed",
          "validation"
        );
        setMachineBarcode("");
        setStatus("fail");

        setTimeout(() => {
          if (machineBarcodeRef.current) {
            machineBarcodeRef.current.focus();
          }
        }, 100);

        return;
      }
    }

    // Validate invoice and part number matching
    if (!selectedInvoiceNo || !invoicePartDetails.partNo) {
      showErrorDialog(
        "Please select an invoice and load invoice details first!",
        "Setup Required",
        "warning"
      );
      setMachineBarcode("");
      return;
    }

    if (!binPartDetails.partNo) {
      showErrorDialog(
        "Please scan a bin QR code first!",
        "Bin QR Required",
        "warning"
      );
      setMachineBarcode("");
      return;
    }

    // Strict part number validation
    const validation = validatePartNumberMatch();
    if (!validation.isValid) {
      showErrorDialog(
        `Cannot scan parts: ${validation.message}`,
        "Part Number Validation Failed",
        "validation"
      );
      setMachineBarcode("");
      return;
    }

    try {
      // Store raw scan data
      try {
        await storeRawScanData(rawValue);
      } catch (rawStoreError) {
        console.error("Failed to store raw scan data:", rawStoreError);
      }

      let extractedPartNumber = "";
      let extractedSerialNumber = "";
      let parsedData = null;

      try {
        extractedPartNumber = extractPartNumberFromBarcode(trimmedValue);
      } catch (extractionError) {
        if (
          binPartDetails.partNo &&
          trimmedValue === binPartDetails.partNo.trim()
        ) {
          extractedPartNumber = trimmedValue;
        } else {
          showErrorDialog(
            "Unable to extract part number from barcode",
            "Part Number Extraction Error",
            "error"
          );
          setMachineBarcode("");
          return;
        }
      }

      try {
        parsedData = parseMachineBarcode(trimmedValue);
        extractedSerialNumber = parsedData.Serial_no;
      } catch (parseError) {
        const serialMatch = trimmedValue.match(/(\d{4})$/);
        extractedSerialNumber = serialMatch
          ? serialMatch[1]
          : `AUTO_${Date.now()}`;
      }

      // Check for duplicate serial number
      const duplicateCheck = checkDuplicateSerialNumber(
        extractedSerialNumber,
        extractedPartNumber
      );
      if (duplicateCheck.isDuplicate) {
        showErrorDialog(
          duplicateCheck.message,
          "Duplicate Serial Number Detected",
          "validation"
        );
        setMachineBarcode("");
        setStatus("fail");

        setTimeout(() => {
          if (machineBarcodeRef.current) {
            machineBarcodeRef.current.focus();
          }
        }, 100);

        return;
      }

      // Triple validation - invoice, bin, and scanned part must all match
      const invoicePartNo = invoicePartDetails.partNo?.trim();
      const binPartNo = binPartDetails.partNo?.trim();
      const scannedPartNo = extractedPartNumber?.trim();

      if (invoicePartNo !== binPartNo) {
        showErrorDialog(
          `Invoice and bin part numbers don't match!\nInvoice: ${invoicePartNo}\nBin: ${binPartNo}`,
          "Invoice-Bin Mismatch",
          "validation"
        );
        setMachineBarcode("");
        return;
      }

      if (scannedPartNo !== invoicePartNo) {
        showErrorDialog(
          `Scanned part doesn't match invoice!\nExpected: ${invoicePartNo}\nScanned: ${scannedPartNo}`,
          "Scanned Part Mismatch",
          "validation"
        );
        setMachineBarcode("");
        return;
      }

      // All validations passed - continue with processing
      if (
        binPartDetails.partNo &&
        binPartDetails.partNo.trim() === extractedPartNumber.trim()
      ) {
        setPartScanDetails({
          partNo: extractedPartNumber,
          serialNo: extractedSerialNumber,
        });

        try {
          if (
            parsedData &&
            (trimmedValue.includes(" ") || trimmedValue.length > 15)
          ) {
            await saveMachineScanData(parsedData);
          }
        } catch (parseError) {
          console.log(
            "Machine scan data save failed, proceeding with part number match"
          );
        }

        const partScanData = {
          partNumber: extractedPartNumber,
          shift: parsedData?.staticshift || "1",
          serialNumber: extractedSerialNumber,
          date:
            parsedData?.date ||
            new Date().toLocaleDateString("en-GB").replace(/\//g, ""),
          binNumber: currentBinTag,
          invoiceNumber: selectedInvoiceNo,
          scanTimestamp: new Date().toISOString(),
          scanStatus: "pass",
          rawBarcodeData: rawValue,
          totalQuantity: binPartDetails.quantity,
          sessionId: sessionId,
        };

        savePartScanData(partScanData).catch(console.error);

        // Add the serial number to scanned list AFTER successful processing
        addScannedSerialNumber(extractedSerialNumber, extractedPartNumber);

        setStatus("pass");
        const newScannedQuantity = scannedQuantity + 1;
        const totalBinQuantity = Number(binPartDetails.quantity);

        setTotalPartCount((prev) => prev + 1);
        setScannedQuantity(newScannedQuantity);

        const progressPercent = Math.round(
          (newScannedQuantity / totalBinQuantity) * 100
        );
        setProgress(progressPercent);

        try {
          const progressResponse = await updateScanProgress(
            currentBinTag,
            newScannedQuantity,
            {
              isValid: true,
              machineData: parsedData,
            }
          );

          if (
            progressResponse.isCompleted ||
            newScannedQuantity >= totalBinQuantity
          ) {
            // Bin completed - trigger bin completion logic
            await onBinCompleted();
            setStatus("✅ completed");
          } else {
            toast.success(
              `Part scanned! ${newScannedQuantity}/${totalBinQuantity} (${progressPercent}%)`
            );

            // Save statistics after each scan
            setTimeout(async () => {
              await saveCurrentStatistics();
            }, 100);
          }
        } catch (error) {
          toast.success(
            `Part scanned! ${newScannedQuantity}/${totalBinQuantity} (${progressPercent}%)`
          );

          // Even if progress update fails, still handle bin completion
          if (newScannedQuantity >= totalBinQuantity) {
            await onBinCompleted();
          } else {
            // Save statistics after scan even if progress update fails
            setTimeout(async () => {
              await saveCurrentStatistics();
            }, 100);
          }
        }

        setMachineBarcode("");

        if (newScannedQuantity >= totalBinQuantity) {
          setTotalPackageCount((prev) => prev + 1);

          setCompletionDialogData({
            binNo: currentBinTag,
            invoiceNo: selectedInvoiceNo,
            partNo: binPartDetails.partNo,
            totalQuantity: totalBinQuantity,
            scannedQuantity: newScannedQuantity,
          });
          setCompletionDialogOpen(true);

          // Reset bin states for next bin
          setBinPartDetails({
            partNo: "",
            partName: "",
            quantity: "",
            originalQuantity: "",
          });
          setPartScanDetails({ partNo: "", serialNo: "" });
          setBinQuantity("");
          setCurrentBinTag("");
          setStatus("⚠️ processing");
          setRemainingBinQuantity(0);
          setScannedQuantity(0);
          setProgress(0);

          // Clear scanned serial numbers for next bin
          clearScannedSerialNumbers();

          // Save statistics after bin completion
          setTimeout(async () => {
            await saveCurrentStatistics();
          }, 500);
        } else {
          setRemainingBinQuantity((prev) => Math.max(0, prev - 1));
          setTimeout(() => {
            if (machineBarcodeRef.current) {
              machineBarcodeRef.current.focus();
            }
          }, 100);
        }
      } else if (binPartDetails.partNo) {
        const mismatchMsg = `Part number mismatch!\nExpected: "${binPartDetails.partNo.trim()}"\nExtracted: "${extractedPartNumber.trim()}"`;
        setMismatchMessage(mismatchMsg);
        setMismatchDialogOpen(true);
        setStatus("fail");

        setTimeout(() => {
          setMachineBarcode("");
          if (machineBarcodeRef.current) {
            machineBarcodeRef.current.focus();
          }
        }, 500);
      }
    } catch (error) {
      console.error("Error processing machine barcode:", error);
      showErrorDialog(
        "Failed to process barcode",
        "Barcode Processing Error",
        "error"
      );
      setMachineBarcode("");
      setStatus("fail");
    }
  };

  const handleResetAllCounts = async () => {
    try {
      setTotalPartCount(0);
      setTotalPackageCount(0);
      setScannedQuantity(0);
      setScannedPartsCount(0);
      setRemainingTotalQuantity(
        parseInt(invoicePartDetails.originalQuantity) || 0
      );
      setRemainingBinQuantity(parseInt(binPartDetails.originalQuantity) || 0);
      setProgress(0);

      // Reset bin tracking
      setCompletedBinCount(0);
      setInvoiceProgress((prev) => ({
        ...prev,
        scannedQuantity: 0,
        completedBins: 0,
        remainingQuantity: prev.totalQuantity,
      }));

      // Clear scanned serial numbers when resetting all counts
      clearScannedSerialNumbers();

      // Save statistics after reset
      setTimeout(async () => {
        await saveCurrentStatistics();
      }, 500);

      toast.success("All counts reset successfully");
    } catch (error) {
      console.error("Error resetting counts:", error);
      showErrorDialog("Failed to reset counts", "Reset Error", "error");
    }
  };

  const handleCloseMismatchDialog = () => {
    setMismatchDialogOpen(false);
    setMismatchMessage("");
    setStatus("⚠️ processing");
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Toaster
        position="top-right"
        toastOptions={{
          success: {
            duration: 2000,
            style: {
              background: "#10B981",
              color: "white",
            },
          },
          error: {
            duration: 3000,
            style: {
              background: "#EF4444",
              color: "white",
            },
          },
        }}
      />

      {/* Error Dialog */}
      <Dialog
        open={errorDialogOpen}
        onClose={closeErrorDialog}
        maxWidth="md"
        fullWidth
        fullScreen={isSmall}
        PaperProps={{
          sx: {
            borderRadius: 3,
            boxShadow: "0 12px 40px rgba(0,0,0,0.15)",
            border:
              errorDialogData.type === "error"
                ? "2px solid #f44336"
                : errorDialogData.type === "validation"
                ? "2px solid #ff9800"
                : "2px solid #ffb74d",
          },
        }}
      >
        <DialogTitle
          sx={{
            bgcolor:
              errorDialogData.type === "error"
                ? "#f44336"
                : errorDialogData.type === "validation"
                ? "#ff9800"
                : "#ffb74d",
            color: "white",
            textAlign: "center",
            py: 3,
            position: "relative",
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 2,
            }}
          >
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: "50%",
                bgcolor: "rgba(255,255,255,0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "24px",
              }}
            >
              <ErrorOutlineIcon sx={{ fontSize: "28px", color: "white" }} />
            </Box>
            <Box>
              <Typography variant="h5" fontWeight="600">
                {errorDialogData.title}
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9, mt: 0.5 }}>
                {errorDialogData.type === "validation"
                  ? "Validation Error"
                  : errorDialogData.type === "warning"
                  ? "Warning"
                  : "System Error"}
              </Typography>
            </Box>
          </Box>
        </DialogTitle>

        <DialogContent sx={{ p: 3 }}>
          <Box
            sx={{
              bgcolor:
                errorDialogData.type === "error"
                  ? "#ffebee"
                  : errorDialogData.type === "validation"
                  ? "#fff3e0"
                  : "#fff8e1",
              borderLeft: `4px solid ${
                errorDialogData.type === "error"
                  ? "#f44336"
                  : errorDialogData.type === "validation"
                  ? "#ff9800"
                  : "#ffb74d"
              }`,
              p: 2,
              borderRadius: 1,
              mb: 2,
            }}
          >
            <Typography
              variant="body1"
              sx={{
                whiteSpace: "pre-line",
                lineHeight: 1.6,
                color:
                  errorDialogData.type === "error"
                    ? "#c62828"
                    : errorDialogData.type === "validation"
                    ? "#ef6c00"
                    : "#e65100",
              }}
            >
              {errorDialogData.message}
            </Typography>
          </Box>

          {errorDialogData.type === "validation" && (
            <Box
              sx={{
                mt: 2,
                p: 2,
                bgcolor: "#e3f2fd",
                borderRadius: 1,
                border: "1px solid #bbdefb",
              }}
            >
              <Typography variant="body2" color="#1976d2" fontWeight="500">
                💡 Tip: Ensure you have selected the correct invoice and scanned
                the appropriate bin before scanning parts.
              </Typography>
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 3, justifyContent: "center" }}>
          <Button
            onClick={closeErrorDialog}
            variant="contained"
            size="large"
            sx={{
              bgcolor:
                errorDialogData.type === "error"
                  ? "#f44336"
                  : errorDialogData.type === "validation"
                  ? "#ff9800"
                  : "#ffb74d",
              px: 4,
              py: 1.5,
              fontSize: "1.1rem",
              fontWeight: "600",
              "&:hover": {
                bgcolor:
                  errorDialogData.type === "error"
                    ? "#d32f2f"
                    : errorDialogData.type === "validation"
                    ? "#f57c00"
                    : "#ffa726",
              },
            }}
          >
            OK
          </Button>
        </DialogActions>
      </Dialog>

      {/* All Bins Completed Dialog */}
      <Dialog
        open={allBinsCompletedDialogOpen}
        onClose={() => setAllBinsCompletedDialogOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            boxShadow: "0 12px 40px rgba(0,0,0,0.15)",
            border: "2px solid #4CAF50",
          },
        }}
      >
        <DialogTitle
          sx={{
            bgcolor: "linear-gradient(135deg, #4CAF50 0%, #45a049 100%)",
            color: "white",
            textAlign: "center",
            py: 4,
            position: "relative",
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 2,
            }}
          >
            <Box
              sx={{
                width: 60,
                height: 60,
                borderRadius: "50%",
                bgcolor: "rgba(255,255,255,0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "32px",
              }}
            >
              🎉
            </Box>
            <Box>
              <Typography variant="h4" fontWeight="700">
                INVOICE COMPLETED!
              </Typography>
              <Typography variant="h6" sx={{ opacity: 0.9, mt: 0.5 }}>
                All bins processed successfully
              </Typography>
            </Box>
          </Box>
        </DialogTitle>

        <DialogContent sx={{ p: 4 }}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Box
                sx={{
                  bgcolor: "#E8F5E8",
                  borderRadius: 2,
                  p: 3,
                  textAlign: "center",
                  border: "2px solid #C8E6C9",
                }}
              >
                <Typography variant="h5" color="#2E7D32" fontWeight="600">
                  Invoice {selectedInvoiceNo} - 100% Complete
                </Typography>
                <Typography variant="body1" sx={{ mt: 1, color: "#4CAF50" }}>
                  Total Bins Processed: {completedBinCount}/{totalBinCount}
                </Typography>
                <Typography variant="body1" sx={{ color: "#4CAF50" }}>
                  Total Parts Scanned: {scannedPartsCount}/
                  {invoicePartDetails.originalQuantity}
                </Typography>
              </Box>
            </Grid>

            <Grid item xs={12} sm={6}>
              <Box sx={{ textAlign: "center" }}>
                <Typography variant="caption" color="text.secondary">
                  PART NUMBER
                </Typography>
                <Typography
                  variant="h6"
                  fontWeight="600"
                  sx={{ fontFamily: "monospace" }}
                >
                  {invoicePartDetails.partNo}
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </DialogContent>

        <DialogActions sx={{ p: 3, justifyContent: "center" }}>
          <Button
            onClick={() => setAllBinsCompletedDialogOpen(false)}
            variant="contained"
            size="large"
            sx={{
              bgcolor: "#4CAF50",
              px: 4,
              py: 1.5,
              fontSize: "1.1rem",
              fontWeight: "600",
              "&:hover": { bgcolor: "#45a049" },
            }}
          >
            Continue to Next Invoice
          </Button>
        </DialogActions>
      </Dialog>

      {/* Mismatch Dialog */}
      <Dialog
        open={mismatchDialogOpen}
        onClose={() => {
          setMismatchDialogOpen(false);
          setMismatchMessage("");
          setStatus("⚠️ processing");
        }}
      >
        <DialogTitle sx={{ color: "error.main" }}>
          Part Number Mismatch
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ whiteSpace: "pre-line" }}>
            {mismatchMessage}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setMismatchDialogOpen(false);
              setMismatchMessage("");
              setStatus("⚠️ processing");
            }}
            color="primary"
          >
            OK
          </Button>
        </DialogActions>
      </Dialog>

      {/* Completion Dialog */}
      <Dialog
        open={completionDialogOpen}
        onClose={() => setCompletionDialogOpen(false)}
        maxWidth="md"
        fullWidth
        fullScreen={isSmall}
        PaperProps={{
          sx: {
            borderRadius: 2,
            boxShadow: "0 8px 32px rgba(0,0,0,0.08)",
            border: "1px solid #E8E8E8",
          },
        }}
      >
        <DialogTitle
          sx={{
            bgcolor: "#F8F9FA",
            color: "#2C3E50",
            textAlign: "center",
            py: 3,
            position: "relative",
            borderBottom: "2px solid #E3F2FD",
            "&::before": {
              content: '""',
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: "4px",
              bgcolor: "#64B5F6",
            },
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 2,
            }}
          >
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: "50%",
                bgcolor: "#E8F5E8",
                border: "2px solid #81C784",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "24px",
                color: "#4CAF50",
              }}
            >
              ✓
            </Box>
            <Box>
              <Typography variant="h5" fontWeight="600" color="#2C3E50">
                BIN PROCESSING COMPLETE
              </Typography>
              <Typography
                variant="body2"
                sx={{ opacity: 0.7, mt: 0.5, color: "#64B5F6" }}
              >
                Processing completed successfully
              </Typography>
            </Box>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          <Box
            sx={{
              bgcolor: "#F0F8F0",
              borderLeft: "4px solid #81C784",
              p: 2,
              display: "flex",
              alignItems: "center",
              gap: 2,
            }}
          >
            <Box
              sx={{
                width: 12,
                height: 12,
                borderRadius: "50%",
                bgcolor: "#4CAF50",
                animation: "pulse 2s infinite",
                "@keyframes pulse": {
                  "0%": { opacity: 1 },
                  "50%": { opacity: 0.5 },
                  "100%": { opacity: 1 },
                },
              }}
            />
            <Typography variant="body1" fontWeight="600" color="#2E7D32">
              All {completionDialogData.totalQuantity} components successfully
              processed and verified
            </Typography>
          </Box>

          <Box sx={{ p: isSmall ? 1 : 3 }}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Typography
                  variant="overline"
                  sx={{
                    fontSize: "0.85rem",
                    fontWeight: 700,
                    color: "#64B5F6",
                  }}
                >
                  PRODUCTION DETAILS
                </Typography>
                <Box sx={{ mt: 1, mb: 2, height: "2px", bgcolor: "#E3F2FD" }} />
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <Box sx={{ textAlign: "center" }}>
                  <Typography
                    variant="caption"
                    color="#78909C"
                    sx={{ textTransform: "uppercase" }}
                  >
                    Bin No
                  </Typography>
                  <Typography
                    variant="h6"
                    fontWeight="bold"
                    sx={{ mt: 0.5, fontFamily: "monospace", color: "#37474F" }}
                  >
                    {completionDialogData.binNo}
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <Box sx={{ textAlign: "center" }}>
                  <Typography
                    variant="caption"
                    color="#78909C"
                    sx={{ textTransform: "uppercase" }}
                  >
                    Part Number
                  </Typography>
                  <Typography
                    variant="h6"
                    fontWeight="bold"
                    sx={{ mt: 0.5, fontFamily: "monospace", color: "#37474F" }}
                  >
                    {completionDialogData.partNo}
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <Box sx={{ textAlign: "center" }}>
                  <Typography
                    variant="caption"
                    color="#78909C"
                    sx={{ textTransform: "uppercase" }}
                  >
                    Quantity
                  </Typography>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      mt: 0.5,
                    }}
                  >
                    <Typography variant="h5" fontWeight="bold" color="#4CAF50">
                      {completionDialogData.scannedQuantity}
                    </Typography>
                    <Typography variant="h6" color="#78909C" sx={{ mx: 0.5 }}>
                      /
                    </Typography>
                    <Typography variant="h6" color="#78909C">
                      {completionDialogData.totalQuantity}
                    </Typography>
                  </Box>
                </Box>
              </Grid>
              <Grid item xs={12}>
                <Box
                  sx={{
                    mt: 2,
                    p: 2.5,
                    bgcolor: "#FAFBFC",
                    borderRadius: 2,
                    border: "1px solid #E1F5FE",
                  }}
                >
                  <Typography
                    variant="body2"
                    color="#455A64"
                    sx={{ textAlign: "center", lineHeight: 1.6 }}
                  >
                    <strong style={{ color: "#2C3E50" }}>
                      PROCESS SUMMARY:
                    </strong>{" "}
                    Bin no: {completionDialogData.binNo} has been successfully
                    processed with all {completionDialogData.totalQuantity}{" "}
                    components scanned, verified, and approved for next stage
                    operations.
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions
          sx={{
            p: isSmall ? 1 : 3,
            bgcolor: "#F8F9FA",
            justifyContent: "space-between",
            borderTop: "2px solid #E3F2FD",
            flexDirection: isSmall ? "column" : "row",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                bgcolor: "#4CAF50",
              }}
            />
            <Typography variant="body2" color="#64B5F6" fontWeight="500">
              Ready for next operation
            </Typography>
          </Box>
          <Button
            onClick={() => setCompletionDialogOpen(false)}
            variant="contained"
            size="large"
            sx={{
              bgcolor: "#64B5F6",
              color: "white",
              px: isSmall ? 2 : 4,
              py: 1.5,
              fontWeight: "600",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              borderRadius: 2,
              boxShadow: "0 4px 12px rgba(100, 181, 246, 0.3)",
              "&:hover": {
                bgcolor: "#42A5F5",
                boxShadow: "0 6px 16px rgba(100, 181, 246, 0.4)",
              },
            }}
          >
            Continue Production
          </Button>
        </DialogActions>
      </Dialog>

      <Container maxWidth="xl" sx={{ flex: 1, overflow: "auto" }}>
        <Grid container spacing={isSmall ? 0.5 : 1} sx={{ height: "100%" }}>
          {/* Left Column - Input Forms */}
          <Grid
            item
            xs={12}
            md={8}
            sx={{
              height: "100%",
              pb: isSmall ? 2 : 0,
            }}
          >
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                gap: isSmall ? 0.5 : 1,
                height: "100%",
              }}
            >
              {/* Invoice Details */}
              <Paper sx={{ p: { xs: 1, sm: 1.5 }, flexShrink: 0 }}>
                <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                  <SettingsIcon
                    color="primary"
                    fontSize="small"
                    sx={{ mr: 1 }}
                  />
                  <Typography variant="h6" color="primary">
                    Invoice Details
                  </Typography>
                  {selectedInvoiceNo && (
                    <Tooltip title="Refresh invoice statistics" arrow>
                      <IconButton
                        size="small"
                        onClick={manualRefreshStatistics}
                        sx={{ ml: 2 }}
                      >
                        <RefreshIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                </Box>
                <Grid container spacing={isSmall ? 1 : 2}>
                  <Grid item xs={12} sm={3}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Invoice No</InputLabel>
                      <Select
                        value={selectedInvoiceNo}
                        onChange={handleInvoiceChange}
                        label="Invoice No"
                        autoFocus={!isSmall}
                        disabled={loadingInvoices}
                      >
                        <MenuItem value="">
                          <em>
                            {loadingInvoices ? "Loading..." : "Select Invoice"}
                          </em>
                        </MenuItem>
                        {invoices.map((invoice, index) => (
                          <MenuItem key={index} value={invoice.invoiceNumber}>
                            {invoice.invoiceNumber}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <TextField
                      label="Part No"
                      value={invoicePartDetails.partNo}
                      fullWidth
                      size="small"
                      InputProps={{ readOnly: true }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <TextField
                      label="Part Name"
                      value={invoicePartDetails.partName}
                      fullWidth
                      size="small"
                      InputProps={{
                        readOnly: true,
                        style: {
                          fontWeight: "bold",
                          color: "#1976d2",
                        },
                      }}
                      sx={{
                        "& .MuiInputBase-root": {
                          backgroundColor: "#f5f5f5",
                        },
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <TextField
                      label="Invoice Quantity"
                      value={remainingTotalQuantity}
                      fullWidth
                      size="small"
                      InputProps={{ readOnly: true }}
                      helperText={`Scanned: ${scannedPartsCount}`}
                    />
                  </Grid>
                </Grid>
              </Paper>

              {/* Bin Details */}
              <Paper sx={{ p: { xs: 1, sm: 1.5 }, flexShrink: 0 }}>
                <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                  <QrCodeScannerIcon
                    color="primary"
                    fontSize="small"
                    sx={{ mr: 1 }}
                  />
                  <Typography variant="h6" color="primary">
                    Bin Details
                  </Typography>
                  {currentBinTag && (
                    <Typography
                      variant="caption"
                      sx={{
                        ml: 2,
                        fontWeight: "bold",
                        fontSize: isSmall ? "0.75rem" : "0.85rem",
                      }}
                    >
                      <span style={{ color: "#1976d2" }}>Current Bin:</span>{" "}
                      <span style={{ color: "#2e7d32" }}>{currentBinTag}</span>{" "}
                      | <span style={{ color: "#1976d2" }}>Part Name:</span>{" "}
                      <span style={{ color: "#2e7d32" }}>
                        {binPartDetails.partName}
                      </span>
                    </Typography>
                  )}
                </Box>
                <Grid container spacing={isSmall ? 1 : 2}>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      label="Bin QR Code Scanner"
                      inputRef={scanQuantityRef}
                      value={scanQuantity}
                      onChange={handleScanQuantityChange}
                      fullWidth
                      size="small"
                      autoComplete="off"
                      placeholder="Scan QR code or bin tag..."
                      disabled={!selectedInvoiceNo}
                      multiline
                      maxRows={4}
                      sx={{
                        "& .MuiInputBase-input": {
                          whiteSpace: "pre-wrap",
                          fontSize: "0.8rem",
                        },
                      }}
                      helperText={
                        !selectedInvoiceNo
                          ? "Select invoice first"
                          : "Ready to scan bin QR code"
                      }
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      label="Part No"
                      value={binPartDetails.partNo}
                      fullWidth
                      size="small"
                      InputProps={{ readOnly: true }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      label="Bin Qty"
                      value={binPartDetails.originalQuantity}
                      fullWidth
                      size="small"
                      InputProps={{ readOnly: true }}
                      helperText={`Scanned: ${scannedQuantity}`}
                    />
                  </Grid>
                </Grid>
              </Paper>

              {/* Part Details */}
              <Paper sx={{ p: { xs: 1, sm: 1.5 }, flexShrink: 0 }}>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    mb: 1,
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center" }}>
                    <PrecisionManufacturingIcon
                      color="primary"
                      fontSize="small"
                      sx={{ mr: 1 }}
                    />
                    <Typography variant="h6" color="primary">
                      Part Scanning
                    </Typography>
                  </Box>
                  {binPartDetails.partNo && (
                    <Typography variant="body2" color="info.main">
                      {scannedQuantity}/{binPartDetails.quantity} ({progress}%)
                    </Typography>
                  )}
                </Box>
                <Grid container spacing={isSmall ? 1 : 2} alignItems="center">
                  <Grid item xs={12} sm={4}>
                    <TextField
                      label="Machine Barcode Scanner"
                      inputRef={machineBarcodeRef}
                      value={machineBarcode}
                      onChange={handleMachineBarcodeChange}
                      fullWidth
                      size="small"
                      autoComplete="off"
                      placeholder="Scan: L012331400M52T1001082512833"
                      disabled={isMachineScannerDisabled()}
                      helperText={getMachineScannerHelperText()}
                      error={
                        invoicePartDetails.partNo &&
                        binPartDetails.partNo &&
                        invoicePartDetails.partNo.trim() !==
                          binPartDetails.partNo.trim()
                      }
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      label="Part No"
                      value={partScanDetails.partNo}
                      fullWidth
                      size="small"
                      InputProps={{ readOnly: true }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      label="Serial Number"
                      value={partScanDetails.serialNo}
                      fullWidth
                      size="small"
                      InputProps={{
                        readOnly: true,
                        style: {
                          fontSize: "0.875rem",
                          padding: "8px 12px",
                        },
                      }}
                      InputLabelProps={{
                        shrink: true,
                        style: {
                          fontSize: "0.875rem",
                          transform: "translate(14px, -6px) scale(0.75)",
                        },
                      }}
                    />
                  </Grid>
                </Grid>
                {binPartDetails.partNo && (
                  <Box sx={{ mt: 1.5 }}>
                    <LinearProgress
                      variant="determinate"
                      value={progress}
                      sx={{
                        height: 8,
                        borderRadius: 5,
                        bgcolor: "grey.200",
                        "& .MuiLinearProgress-bar": {
                          borderRadius: 5,
                          bgcolor:
                            progress === 100 ? "success.main" : "primary.main",
                        },
                      }}
                    />
                    <Typography variant="caption" color="text.secondary">
                      {scannedQuantity} of {binPartDetails.quantity} parts
                      scanned from current bin
                    </Typography>
                  </Box>
                )}
              </Paper>

              {/* Status */}
              <Paper
                sx={{
                  p: { xs: 1, sm: 1.5 },
                  textAlign: "center",
                  flexShrink: 0,
                }}
              >
                <Typography
                  variant={isSmall ? "h5" : "h3"}
                  sx={{
                    color:
                      status === "pass"
                        ? "success.main"
                        : status === "fail"
                        ? "error.main"
                        : status === "✅ completed"
                        ? "success.main"
                        : "warning.main",
                  }}
                >
                  {status === "pass"
                    ? "✅ PASS"
                    : status === "fail"
                    ? "❌ FAIL"
                    : status === "✅ completed"
                    ? "✅ COMPLETED"
                    : "⚠️ READY"}
                </Typography>
                {currentBinTag && binPartDetails.partNo && (
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mt: 1 }}
                  >
                    Bin: {currentBinTag} | Progress: {scannedQuantity}/
                    {binPartDetails.quantity}
                  </Typography>
                )}
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ mt: 0.5, display: "block" }}
                >
                  Session ID: {sessionId}
                </Typography>
                {scannedSerialNumbers.size > 0 && (
                  <Typography
                    variant="caption"
                    color="info.main"
                    sx={{ mt: 0.5, display: "block", fontWeight: "bold" }}
                  >
                    Scanned Serials: {scannedSerialNumbers.size}
                  </Typography>
                )}
              </Paper>
            </Box>
          </Grid>

          {/* Right Column - ENHANCED Statistics */}
          <Grid item xs={12} md={4} sx={{ height: isSmall ? "auto" : "100%" }}>
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                gap: isSmall ? 0.5 : 1,
                height: "100%",
              }}
            >
              {/* ENHANCED Statistics Cards with Real-time Updates */}
              <Grid container spacing={isSmall ? 1 : 2}>
                <Grid item xs={12} sm={6}>
                  <Paper sx={{ p: { xs: 1, sm: 1.5 }, textAlign: "center" }}>
                    <Tooltip title="Reset all counts" arrow>
                      <IconButton size="small" onClick={handleResetAllCounts}>
                        <InventoryIcon color="primary" />
                      </IconButton>
                    </Tooltip>
                    <Typography variant="body2" color="primary">
                      Invoice Remaining
                    </Typography>
                    <Typography
                      variant="h4"
                      sx={{
                        color:
                          remainingTotalQuantity === 0
                            ? "success.main"
                            : "text.primary",
                        fontWeight:
                          remainingTotalQuantity === 0 ? "bold" : "normal",
                      }}
                    >
                      {remainingTotalQuantity || 0}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Out of {invoicePartDetails.originalQuantity || 0}
                    </Typography>
                    {/* Progress indicator */}
                    {invoicePartDetails.originalQuantity > 0 && (
                      <Box sx={{ mt: 1 }}>
                        <LinearProgress
                          variant="determinate"
                          value={
                            ((parseInt(invoicePartDetails.originalQuantity) -
                              remainingTotalQuantity) /
                              parseInt(invoicePartDetails.originalQuantity)) *
                            100
                          }
                          sx={{
                            height: 4,
                            borderRadius: 2,
                            bgcolor: "grey.200",
                            "& .MuiLinearProgress-bar": {
                              borderRadius: 2,
                              bgcolor:
                                remainingTotalQuantity === 0
                                  ? "success.main"
                                  : "primary.main",
                            },
                          }}
                        />
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ fontSize: "0.7rem" }}
                        >
                          {Math.round(
                            ((parseInt(invoicePartDetails.originalQuantity) -
                              remainingTotalQuantity) /
                              parseInt(invoicePartDetails.originalQuantity)) *
                              100
                          )}
                          % Complete
                        </Typography>
                      </Box>
                    )}
                  </Paper>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Paper sx={{ p: { xs: 1, sm: 1.5 }, textAlign: "center" }}>
                    <LocalShippingIcon color="primary" />
                    <Typography variant="body2" color="primary">
                      Current Bin Quantity
                    </Typography>
                    <Typography variant="h4">
                      {binPartDetails.originalQuantity || 0}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {currentBinTag
                        ? `Bin: ${currentBinTag}`
                        : "No bin selected"}
                    </Typography>
                    {/* Current bin progress */}
                    {binPartDetails.originalQuantity > 0 && (
                      <Box sx={{ mt: 1 }}>
                        <LinearProgress
                          variant="determinate"
                          value={progress}
                          sx={{
                            height: 4,
                            borderRadius: 2,
                            bgcolor: "grey.200",
                            "& .MuiLinearProgress-bar": {
                              borderRadius: 2,
                              bgcolor:
                                progress === 100
                                  ? "success.main"
                                  : "secondary.main",
                            },
                          }}
                        />
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ fontSize: "0.7rem" }}
                        >
                          {scannedQuantity}/{binPartDetails.originalQuantity}{" "}
                          Scanned
                        </Typography>
                      </Box>
                    )}
                  </Paper>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Paper sx={{ p: { xs: 1, sm: 1.5 }, textAlign: "center" }}>
                    <BackpackIcon color="primary" />
                    <Typography variant="body2" color="primary">
                      Total Parts Scanned
                    </Typography>
                    <Typography
                      variant="h4"
                      sx={{
                        color:
                          scannedPartsCount > 0
                            ? "success.main"
                            : "text.primary",
                      }}
                    >
                      {scannedPartsCount}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Across all bins
                    </Typography>
                    {/* Real-time scanning rate */}
                    {scannedPartsCount > 0 &&
                      invoicePartDetails.originalQuantity > 0 && (
                        <Box sx={{ mt: 1 }}>
                          <LinearProgress
                            variant="determinate"
                            value={
                              (scannedPartsCount /
                                parseInt(invoicePartDetails.originalQuantity)) *
                              100
                            }
                            sx={{
                              height: 4,
                              borderRadius: 2,
                              bgcolor: "grey.200",
                              "& .MuiLinearProgress-bar": {
                                borderRadius: 2,
                                bgcolor: "success.main",
                              },
                            }}
                          />
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ fontSize: "0.7rem" }}
                          >
                            {Math.round(
                              (scannedPartsCount /
                                parseInt(invoicePartDetails.originalQuantity)) *
                                100
                            )}
                            % of Invoice
                          </Typography>
                        </Box>
                      )}
                  </Paper>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Paper sx={{ p: { xs: 1, sm: 1.5 }, textAlign: "center" }}>
                    <QrCodeScannerIcon color="secondary" />
                    <Typography variant="body2" color="primary">
                      Bin Progress
                    </Typography>
                    <Typography variant="h4">
                      {totalBinCount > 0
                        ? `${completedBinCount}/${totalBinCount}`
                        : binPartDetails.quantity
                        ? `${scannedQuantity}/${binPartDetails.quantity}`
                        : "0/0"}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {totalBinCount > 0
                        ? "Completed bins"
                        : "Current bin progress"}
                    </Typography>
                    {/* Bin completion progress */}
                    {totalBinCount > 0 && (
                      <Box sx={{ mt: 1 }}>
                        <LinearProgress
                          variant="determinate"
                          value={(completedBinCount / totalBinCount) * 100}
                          sx={{
                            height: 4,
                            borderRadius: 2,
                            bgcolor: "grey.200",
                            "& .MuiLinearProgress-bar": {
                              borderRadius: 2,
                              bgcolor:
                                completedBinCount >= totalBinCount
                                  ? "success.main"
                                  : "info.main",
                            },
                          }}
                        />
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ fontSize: "0.7rem" }}
                        >
                          {Math.round(
                            (completedBinCount / totalBinCount) * 100
                          )}
                          % Bins Complete
                        </Typography>
                      </Box>
                    )}
                  </Paper>
                </Grid>
              </Grid>

              {/* ENHANCED Invoice Info with Real-time Updates */}
              {selectedInvoiceNo && (
                <Paper sx={{ p: { xs: 1, sm: 1.5 }, flexShrink: 0 }}>
                  <Typography variant="body1" color="primary" gutterBottom>
                    📋 Current Invoice
                  </Typography>
                  <Box sx={{ fontSize: "0.75rem" }}>
                    <Typography variant="caption" display="block">
                      <strong>Invoice:</strong> {selectedInvoiceNo}
                    </Typography>
                    <Typography variant="caption" display="block">
                      <strong>Part:</strong> {invoicePartDetails.partNo}
                    </Typography>
                    <Typography variant="caption" display="block">
                      <strong>Part Name:</strong> {invoicePartDetails.partName}
                    </Typography>
                    <Typography variant="caption" display="block">
                      <strong>Total Qty:</strong>{" "}
                      {invoicePartDetails.originalQuantity}
                    </Typography>
                    <Typography
                      variant="caption"
                      display="block"
                      sx={{
                        fontWeight: "bold",
                        color:
                          remainingTotalQuantity === 0
                            ? "success.main"
                            : "text.primary",
                      }}
                    >
                      <strong>Remaining:</strong> {remainingTotalQuantity}
                    </Typography>
                    <Typography
                      variant="caption"
                      display="block"
                      sx={{
                        fontWeight: "bold",
                        color:
                          scannedPartsCount > 0
                            ? "success.main"
                            : "text.primary",
                      }}
                    >
                      <strong>Scanned:</strong> {scannedPartsCount}
                    </Typography>
                    {totalBinCount > 0 && (
                      <>
                        <Typography variant="caption" display="block">
                          <strong>Total Bins:</strong> {totalBinCount}
                        </Typography>
                        <Typography
                          variant="caption"
                          display="block"
                          sx={{
                            fontWeight: "bold",
                            color:
                              completedBinCount > 0
                                ? "success.main"
                                : "text.primary",
                          }}
                        >
                          <strong>Completed Bins:</strong> {completedBinCount}
                        </Typography>
                        <Typography
                          variant="caption"
                          display="block"
                          sx={{
                            fontWeight: "bold",
                            color:
                              completedBinCount >= totalBinCount
                                ? "success.main"
                                : "info.main",
                          }}
                        >
                          <strong>Progress:</strong>{" "}
                          {Math.round(
                            (completedBinCount / totalBinCount) * 100
                          )}
                          %
                        </Typography>
                      </>
                    )}
                    {/* ENHANCED: Show efficiency metrics */}
                    <Typography
                      variant="caption"
                      display="block"
                      sx={{ mt: 1, color: "info.main" }}
                    >
                      <strong>Session:</strong> {sessionId.slice(-6)}
                    </Typography>
                  </Box>
                </Paper>
              )}

              {/* ENHANCED Bin Progress Details with Real-time Updates */}
              {currentBinTag && (
                <Paper sx={{ p: { xs: 1, sm: 1.5 }, flexShrink: 0 }}>
                  <Typography variant="body1" color="primary" gutterBottom>
                    📦 Current Bin
                  </Typography>
                  <Box sx={{ fontSize: "0.75rem" }}>
                    <Typography variant="caption" display="block">
                      <strong>Bin:</strong> {currentBinTag}
                    </Typography>
                    <Typography variant="caption" display="block">
                      <strong>Total Qty:</strong>{" "}
                      {binPartDetails.originalQuantity}
                    </Typography>
                    <Typography
                      variant="caption"
                      display="block"
                      sx={{
                        fontWeight: "bold",
                        color: progress === 100 ? "success.main" : "info.main",
                      }}
                    >
                      <strong>Progress:</strong> {scannedQuantity}/
                      {binPartDetails.quantity} ({progress}%)
                    </Typography>
                    {totalBinCount > 0 && (
                      <>
                        <Typography variant="caption" display="block">
                          <strong>Bin #{completedBinCount + 1}</strong> of{" "}
                          {totalBinCount}
                        </Typography>
                        <Typography
                          variant="caption"
                          display="block"
                          sx={{
                            fontWeight: "bold",
                            color:
                              completedBinCount >= totalBinCount
                                ? "success.main"
                                : "info.main",
                          }}
                        >
                          <strong>Overall Progress:</strong>{" "}
                          {Math.round(
                            (completedBinCount / totalBinCount) * 100
                          )}
                          %
                        </Typography>
                      </>
                    )}
                    {scannedSerialNumbers.size > 0 && (
                      <Typography
                        variant="caption"
                        display="block"
                        sx={{ color: "#1976d2", fontWeight: "bold" }}
                      >
                        <strong>Unique Serials Scanned:</strong>{" "}
                        {scannedSerialNumbers.size}
                      </Typography>
                    )}
                    {/* ENHANCED: Show remaining for current bin */}
                    <Typography
                      variant="caption"
                      display="block"
                      sx={{
                        color:
                          remainingBinQuantity === 0
                            ? "success.main"
                            : "warning.main",
                        fontWeight: "bold",
                      }}
                    >
                      <strong>Remaining in Bin:</strong> {remainingBinQuantity}
                    </Typography>
                  </Box>
                  {totalBinCount > 0 && (
                    <Box sx={{ mt: 1.5 }}>
                      <LinearProgress
                        variant="determinate"
                        value={(completedBinCount / totalBinCount) * 100}
                        sx={{
                          height: 6,
                          borderRadius: 3,
                          bgcolor: "grey.200",
                          "& .MuiLinearProgress-bar": {
                            borderRadius: 3,
                            bgcolor:
                              completedBinCount >= totalBinCount
                                ? "success.main"
                                : "info.main",
                          },
                        }}
                      />
                      <Typography variant="caption" color="text.secondary">
                        {completedBinCount} of {totalBinCount} bins completed
                      </Typography>
                    </Box>
                  )}
                </Paper>
              )}

              {/* ENHANCED: Real-time Performance Metrics */}
              {selectedInvoiceNo && scannedPartsCount > 0 && (
                <Paper sx={{ p: { xs: 1, sm: 1.5 }, flexShrink: 0 }}>
                  <Typography variant="body1" color="primary" gutterBottom>
                    📊 Performance Metrics
                  </Typography>
                  <Box sx={{ fontSize: "0.75rem" }}>
                    <Typography variant="caption" display="block">
                      <strong>Completion Rate:</strong>{" "}
                      {Math.round(
                        (scannedPartsCount /
                          parseInt(invoicePartDetails.originalQuantity)) *
                          100
                      )}
                      %
                    </Typography>
                    {totalBinCount > 0 && (
                      <Typography variant="caption" display="block">
                        <strong>Bin Efficiency:</strong>{" "}
                        {Math.round((completedBinCount / totalBinCount) * 100)}%
                      </Typography>
                    )}
                    <Typography variant="caption" display="block">
                      <strong>Parts per Bin:</strong>{" "}
                      {binPartDetails.originalQuantity || "N/A"}
                    </Typography>
                    {scannedSerialNumbers.size > 0 && (
                      <Typography
                        variant="caption"
                        display="block"
                        sx={{ color: "success.main" }}
                      >
                        <strong>Unique Serials:</strong>{" "}
                        {scannedSerialNumbers.size}
                      </Typography>
                    )}
                  </Box>
                </Paper>
              )}
            </Box>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};

export default Dispatch;
