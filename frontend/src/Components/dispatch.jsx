import React, { useEffect, useState, useRef } from "react";
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
import PersonIcon from "@mui/icons-material/Person";
import QrCode2Icon from "@mui/icons-material/QrCode2";

const Dispatch = () => {
  const theme = useTheme();
  const isSmall = useMediaQuery(theme.breakpoints.down("sm"));

  // NEW: Part name mapping
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
  const [operatorName, setOperatorName] = useState("");

  // Operator Dialog States
  const [operatorDialogOpen, setOperatorDialogOpen] = useState(false);
  const [tempOperatorName, setTempOperatorName] = useState("");
  const [pendingInvoiceNo, setPendingInvoiceNo] = useState("");

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
    operatorName: "",
  });

  // NEW: Bin tracking states
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
  const operatorNameRef = useRef(null);
  const operatorDialogRef = useRef(null);

  // NEW: Function to save invoice progress to backend
  const saveInvoiceProgress = async (progressData) => {
    try {
      const response = await api.post("/api/invoice-progress", {
        invoiceNumber: selectedInvoiceNo,
        operatorName: operatorName,
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
      // Don't show error toast for progress saves to avoid UI clutter
      return null;
    }
  };

  // NEW: Function to fetch saved invoice progress
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

        toast.success(
          `Resumed progress: ${progressData.completedBins}/${progressData.totalBins} bins completed`
        );
        return progressData;
      } else {
        // No saved progress, calculate fresh
        return null;
      }
    } catch (error) {
      if (error.response?.status !== 404) {
        console.error("Error fetching invoice progress:", error);
      }
      return null;
    }
  };

  // NEW: Function to calculate bin count and update progress
  const calculateBinProgress = (totalQuantity, binSize, scannedParts = 0) => {
    if (!totalQuantity || !binSize || totalQuantity <= 0 || binSize <= 0) {
      return {
        totalBins: 0,
        completedBins: 0,
        remainingQuantity: totalQuantity || 0,
        progress: {
          totalQuantity: totalQuantity || 0,
          scannedQuantity: scannedParts,
          totalBins: 0,
          completedBins: 0,
          remainingQuantity: totalQuantity || 0,
          binSize: binSize || 0,
        },
      };
    }

    const totalBins = Math.ceil(totalQuantity / binSize);
    const completedBins = Math.floor(scannedParts / binSize);
    const remainingQuantity = Math.max(0, totalQuantity - scannedParts);

    const progressData = {
      totalQuantity: totalQuantity,
      scannedQuantity: scannedParts,
      totalBins: totalBins,
      completedBins: completedBins,
      remainingQuantity: remainingQuantity,
      binSize: binSize,
    };

    return {
      totalBins,
      completedBins,
      remainingQuantity,
      progress: progressData,
    };
  };

  // NEW: Function to update bin progress when a bin is completed
  const onBinCompleted = async () => {
    const newCompletedBins = completedBinCount + 1;
    const newScannedParts =
      scannedPartsCount + parseInt(binPartDetails.quantity);

    setCompletedBinCount(newCompletedBins);
    setScannedPartsCount(newScannedParts);

    const remainingQty = Math.max(
      0,
      parseInt(invoicePartDetails.originalQuantity) - newScannedParts
    );
    setRemainingTotalQuantity(remainingQty);

    // Update invoice progress
    const updatedProgress = {
      totalQuantity: parseInt(invoicePartDetails.originalQuantity),
      scannedQuantity: newScannedParts,
      totalBins: totalBinCount,
      completedBins: newCompletedBins,
      remainingQuantity: remainingQty,
      binSize: parseInt(binPartDetails.quantity),
    };

    setInvoiceProgress(updatedProgress);

    // Save progress to backend
    await saveInvoiceProgress(updatedProgress);

    // Check if all bins are completed
    if (newCompletedBins >= totalBinCount) {
      toast.success(
        `🎉 Invoice ${selectedInvoiceNo} completed! All ${totalBinCount} bins processed successfully!`
      );
      setAllBinsCompletedDialogOpen(true);
    } else {
      toast.success(
        `Bin completed! Progress: ${newCompletedBins}/${totalBinCount} bins (${Math.round(
          (newCompletedBins / totalBinCount) * 100
        )}%)`
      );
    }
  };

  // ENHANCED: Validation helper function
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

  // ENHANCED: Check if machine scanner should be disabled
  const isMachineScannerDisabled = () => {
    return (
      !operatorName.trim() ||
      !selectedInvoiceNo ||
      !invoicePartDetails.partNo ||
      !binPartDetails.partNo ||
      invoicePartDetails.partNo.trim() !== binPartDetails.partNo.trim()
    );
  };

  // ENHANCED: Get helper text for machine scanner
  const getMachineScannerHelperText = () => {
    if (!operatorName.trim()) return "Enter operator name first";
    if (!selectedInvoiceNo) return "Select invoice first";
    if (!invoicePartDetails.partNo) return "Load invoice details first";
    if (!binPartDetails.partNo) return "Scan bin QR code first";
    if (invoicePartDetails.partNo.trim() !== binPartDetails.partNo.trim()) {
      return "Part numbers don't match - scan correct bin";
    }
    return "Ready to scan parts";
  };

  // Simple function to store raw scan data - only the scanned data, nothing else
  const storeRawScanData = async (rawData) => {
    try {
      console.log("Storing raw scan data:", {
        dataLength: rawData ? rawData.length : 0,
        dataPreview: rawData
          ? rawData.substring(0, 50) + (rawData.length > 50 ? "..." : "")
          : "null",
      });

      const response = await api.post("/api/raw-scans", {
        rawData: rawData,
        operatorName: operatorName,
        scannedBy: operatorName,
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

  // Function to save part scanning data (partno, shift, serialno, date)
  const savePartScanData = async (scanData) => {
    try {
      console.log("Saving part scan data to database:", scanData);

      const response = await api.post("/api/partScan", {
        partNumber: scanData.partNumber,
        shift: scanData.shift,
        serialNumber: scanData.serialNumber,
        date: scanData.date,
        binNumber: scanData.binNumber,
        invoiceNumber: scanData.invoiceNumber,
        operatorName: operatorName,
        scannedBy: operatorName,
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

  // Updated function to parse concatenated barcode format
  const parseConcatenatedBarcode = (concatenatedText) => {
    try {
      console.log("Parsing concatenated barcode:", concatenatedText);

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

      console.log("Parsed concatenated barcode:", {
        original: concatenatedText,
        spaced: spacedFormat,
        vendorCode,
        shift,
        partNumber,
        date,
        quantity,
        serial,
        positions: {
          vendorCode: "0-3",
          shift: "4",
          partNumber: "5-15",
          date: "16-21",
          quantity: "22 to -4",
          serial: "last 4",
        },
      });

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

  // Enhanced function to extract part number from various barcode formats
  const extractPartNumberFromBarcode = (barcodeText) => {
    try {
      console.log("Extracting part number from barcode:", barcodeText);
      console.log("Barcode length:", barcodeText.length);

      const cleanedText = barcodeText.trim();

      // Method 1: Full spaced format parsing
      if (cleanedText.includes(" ")) {
        const parts = cleanedText.split(/\s+/);
        console.log("Split parts:", parts);

        if (parts.length >= 3) {
          const partNumber = parts[2];
          console.log("Extracted part number (spaced format):", partNumber);

          if (partNumber.length === 11) {
            return partNumber;
          } else {
            console.log(
              `Warning: Part number length is ${partNumber.length}, expected 11`
            );
            return partNumber;
          }
        }
      }

      // Method 2: Concatenated format parsing
      if (cleanedText.length >= 25 && /^[A-Z]\d{3}\d/.test(cleanedText)) {
        try {
          const partNumber = cleanedText.substring(5, 16);
          console.log(
            "Extracted part number (concatenated format - positions 5-15):",
            partNumber
          );
          console.log("Part number length:", partNumber.length);

          if (partNumber.length === 11) {
            return partNumber;
          } else {
            throw new Error(
              `Part number length mismatch: got ${partNumber.length}, expected 11`
            );
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
        console.log(`Pattern ${i + 1} matches:`, matches);

        if (matches) {
          for (const match of matches) {
            if (match && match.length === 11) {
              console.log(`Extracted part number (pattern ${i + 1}):`, match);
              return match;
            }
          }
        }
      }

      // Method 4: If we have a reference part number, try to find similar pattern
      if (binPartDetails.partNo) {
        const referencePattern = binPartDetails.partNo;
        const referenceLength = referencePattern.length;

        console.log(
          "Using reference pattern:",
          referencePattern,
          "length:",
          referenceLength
        );

        for (let i = 0; i <= cleanedText.length - referenceLength; i++) {
          const candidate = cleanedText.substring(i, i + referenceLength);
          if (candidate.length === referenceLength) {
            console.log(`Checking candidate at position ${i}:`, candidate);

            if (hasSimilarPattern(candidate, referencePattern)) {
              console.log(`Found similar pattern:`, candidate);
              return candidate;
            }
          }
        }
      }

      // Method 5: Last resort - look for any 11-character sequence
      const elevenCharMatches = cleanedText.match(/[A-Z0-9]{11}/gi);
      if (elevenCharMatches && elevenCharMatches.length > 0) {
        console.log("Found 11-character sequences:", elevenCharMatches);

        for (const match of elevenCharMatches) {
          if (/^\d/.test(match)) {
            console.log(
              "Using 11-character sequence starting with digit:",
              match
            );
            return match;
          }
        }

        console.log("Using first 11-character sequence:", elevenCharMatches[0]);
        return elevenCharMatches[0];
      }

      throw new Error(`Unable to extract part number from: ${cleanedText}`);
    } catch (error) {
      console.error("Part number extraction error:", error);
      console.error("Full barcode was:", barcodeText);
      throw error;
    }
  };

  // Helper function for pattern similarity
  const hasSimilarPattern = (candidate, reference) => {
    if (candidate.length !== reference.length) return false;

    let matches = 0;
    for (let i = 0; i < candidate.length; i++) {
      if (candidate[i] === reference[i]) matches++;
    }

    return matches / candidate.length >= 0.7;
  };

  // Enhanced function to parse machine barcode data with better part number extraction
  const parseMachineBarcode = (barcodeText) => {
    try {
      console.log("Parsing Machine Barcode:", barcodeText);

      const cleanedText = barcodeText.trim();

      // Check if this is a concatenated format
      if (
        cleanedText.length >= 25 &&
        /^[A-Z]\d{3}\d/.test(cleanedText) &&
        !cleanedText.includes(" ")
      ) {
        try {
          const parsed = parseConcatenatedBarcode(cleanedText);
          console.log("Successfully parsed concatenated barcode:", parsed);

          const result = {
            vendorCode: parsed.vendorCode,
            staticshift: parsed.shift,
            partNumber: parsed.partNumber,
            date: parsed.date,
            quantity: parseInt(parsed.quantity) || 1,
            Serial_no: parsed.serial,
            rawBarcodeData: barcodeText,
            spacedFormat: parsed.spacedFormat,
            operatorName: operatorName,
            invoiceNumber: selectedInvoiceNo,
            binNumber: currentBinTag,
            timestamp: new Date().toISOString(),
          };

          console.log("Parsed Machine Barcode Data (concatenated):", result);
          return result;
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

      const result = {
        vendorCode,
        staticshift: shift,
        partNumber,
        date,
        quantity,
        Serial_no: serialNo,
        rawBarcodeData: barcodeText,
        operatorName: operatorName,
        invoiceNumber: selectedInvoiceNo,
        binNumber: currentBinTag,
        timestamp: new Date().toISOString(),
      };

      console.log("Parsed Machine Barcode Data:", result);
      return result;
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
        operatorName: operatorName,
        scannedBy: operatorName,
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

      console.error(
        "Failed to save machine scan data:",
        error.response?.data?.message || error.message
      );
      throw error;
    }
  };

  // Updated function to parse QR code data with specific invoice number extraction
  const parseQRCodeData = (qrCodeText) => {
    try {
      console.log("Parsing QR Code:", qrCodeText);

      const cleanedText = qrCodeText.trim();

      const binNoMatch = cleanedText.match(/^(\d{13})/);
      if (!binNoMatch) {
        throw new Error(
          "Could not find bin number (expected 13 digits at start)"
        );
      }
      const binNo = binNoMatch[1];

      let remainingText = cleanedText.substring(13).trim();

      const partNoMatch = remainingText.match(/^[\s]*([A-Z0-9]{11})/);
      if (!partNoMatch) {
        throw new Error(
          "Could not find part number (expected 11 characters after bin number)"
        );
      }
      const partNumber = partNoMatch[1];

      remainingText = remainingText.substring(partNoMatch[0].length).trim();

      const quantityMatch = remainingText.match(/^(\d+)/);
      if (!quantityMatch) {
        throw new Error("Could not find quantity");
      }
      const quantity = parseInt(quantityMatch[1]);

      remainingText = remainingText.substring(quantityMatch[0].length).trim();

      let descriptionOrPartName = "";

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

      descriptionOrPartName = descriptionOrPartName.replace(/,$/, "").trim();

      if (!descriptionOrPartName) {
        throw new Error("Could not find description/part name");
      }

      remainingText = remainingText.substring(endIndex);

      let date = "";
      const allDateMatches = remainingText.match(/\d{2}\/\d{2}\/\d{2}/g);
      if (allDateMatches && allDateMatches.length > 0) {
        date = allDateMatches[0];
      }

      let invoiceNumber = "";

      if (date) {
        const dateIndex = remainingText.indexOf(date);
        if (dateIndex !== -1) {
          const afterDate = remainingText.substring(dateIndex + date.length);

          const cleanAfterDate = afterDate.replace(/\s/g, "");

          if (cleanAfterDate.length >= 10) {
            invoiceNumber = cleanAfterDate.substring(0, 10);
            console.log(
              "Extracted 10-character invoice number after date:",
              invoiceNumber
            );
          } else {
            const invoiceMatch = cleanAfterDate.match(/^([A-Z0-9]{1,10})/);
            if (invoiceMatch) {
              invoiceNumber = invoiceMatch[1];
              console.log("Extracted partial invoice number:", invoiceNumber);
            }
          }
        }
      }

      if (!invoiceNumber) {
        const fullPatternMatch = remainingText.match(
          /\d{2}\/\d{2}\/\d{2}\s*([A-Z0-9]{10})/
        );
        if (fullPatternMatch) {
          invoiceNumber = fullPatternMatch[1];
          console.log(
            "Extracted invoice number using full pattern:",
            invoiceNumber
          );
        }
      }

      if (!invoiceNumber) {
        invoiceNumber = selectedInvoiceNo || "UNKNOWN";
        console.log(
          "No invoice found using date pattern, using fallback:",
          invoiceNumber
        );
      }

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
        invoiceNumber,
        rawQRData: qrCodeText,
        operatorName: operatorName,
        timestamp: new Date().toISOString(),
        sessionId: sessionId,
      };

      console.log("Parsed QR Data:", result);
      return result;
    } catch (error) {
      console.error("Primary QR Parsing Error:", error);

      try {
        console.log("Trying alternative parsing method...");
        return parseQRCodeDataAlternative(qrCodeText);
      } catch (altError) {
        console.error("Alternative QR Parsing Error:", altError);
        throw new Error(`Failed to parse QR code: ${error.message}`);
      }
    }
  };

  // Alternative parsing approach
  const parseQRCodeDataAlternative = (qrCodeText) => {
    try {
      console.log("Alternative parsing for QR Code:", qrCodeText);

      const segments = qrCodeText.trim().split(/\s{2,}/);

      if (segments.length < 4) {
        throw new Error("Insufficient data segments in QR code");
      }

      const binNoMatch = segments[0].match(/(\d{13})/);
      if (!binNoMatch) {
        throw new Error("Could not find bin number in first segment");
      }
      const binNo = binNoMatch[1];

      const partNumber = segments[1].trim();
      if (partNumber.length !== 11) {
        throw new Error(
          `Part number length mismatch: expected 11, got ${partNumber.length}`
        );
      }

      const quantity = parseInt(segments[2].trim());
      if (isNaN(quantity)) {
        throw new Error(`Invalid quantity: ${segments[2]}`);
      }

      let descriptionOrPartName = segments[3];

      descriptionOrPartName = descriptionOrPartName
        .replace(/[,\s]+$/, "")
        .trim();

      const remainingText = segments.slice(4).join(" ");

      const dateMatch = remainingText.match(/\d{2}\/\d{2}\/\d{2}/);
      const date = dateMatch
        ? dateMatch[0]
        : new Date().toLocaleDateString("en-GB");

      const invoiceMatches = remainingText.match(/[A-Z0-9]{10,}/g);
      const invoiceNumber = invoiceMatches
        ? invoiceMatches.reduce(
            (longest, current) =>
              current.length > longest.length ? current : longest,
            ""
          )
        : selectedInvoiceNo || "UNKNOWN";

      const result = {
        binNo,
        partNumber,
        quantity,
        descriptionOrPartName,
        date,
        invoiceNumber,
        rawQRData: qrCodeText,
        operatorName: operatorName,
        timestamp: new Date().toISOString(),
        sessionId: sessionId,
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

  const saveBinDataToDatabase = async (parsedData) => {
    try {
      // FRONTEND VALIDATION: Check invoice numbers match before saving to database
      const selectedInvoice = selectedInvoiceNo?.trim();
      const binInvoice = parsedData.invoiceNumber?.trim();

      console.log("Frontend invoice validation:", {
        selectedInvoice,
        binInvoice,
        selectedInvoicePartNo: invoicePartDetails.partNo,
        binPartNo: parsedData.partNumber,
      });

      // Validate invoice numbers match
      if (!selectedInvoice) {
        const error = "No invoice selected. Please select an invoice first.";
        toast.error(error);
        throw new Error(error);
      }

      if (!binInvoice || binInvoice === "UNKNOWN") {
        const error =
          "Cannot determine bin invoice number from QR code. Please check QR code format.";
        toast.error(error);
        throw new Error(error);
      }

      if (selectedInvoice !== binInvoice) {
        const error = `Invoice validation failed!\n\nSelected Invoice: ${selectedInvoice}\nBin Invoice: ${binInvoice}\n\nThis bin belongs to invoice ${binInvoice}, but you have selected invoice ${selectedInvoice}.\n\nPlease scan a bin that belongs to the selected invoice.`;
        toast.error(error, { duration: 8000 });
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
        toast.error(error);
        throw new Error(error);
      }

      if (selectedPartNo !== binPartNo) {
        const error = `Part number validation failed!\n\nInvoice Part: ${selectedPartNo}\nBin Part: ${binPartNo}\n\nThis bin contains different parts than required for this invoice.`;
        toast.error(error, { duration: 6000 });
        throw new Error(
          `Part number mismatch: Invoice ${selectedPartNo} vs Bin ${binPartNo}`
        );
      }

      // All validations passed - proceed with database save
      console.log("✅ Frontend validation passed - saving to database");

      const response = await api.post("/api/bindata/qr", {
        qrCodeData: parsedData.rawQRData,
        operatorName: operatorName,
        scannedBy: operatorName,
        invoiceNumber: selectedInvoiceNo,
        sessionId: sessionId,
        timestamp: new Date().toISOString(),
        binNumber: parsedData.binNo,
        partNumber: parsedData.partNumber,
        totalQuantity: parsedData.quantity,
        // Add validation metadata
        validatedInvoiceMatch: true,
        validatedPartMatch: true,
        validationTimestamp: new Date().toISOString(),
      });

      if (response.data.success) {
        toast.success(
          `✅ Bin validated and saved successfully!\nInvoice: ${selectedInvoice} | Part: ${selectedPartNo}`
        );
        return response.data.data;
      } else {
        throw new Error(response.data.message || "Failed to save bin data");
      }
    } catch (error) {
      console.error("Error saving bin data:", error);

      // Don't proceed if validation failed
      if (
        error.message.includes("mismatch") ||
        error.message.includes("validation failed")
      ) {
        throw error; // Re-throw validation errors to prevent further processing
      }

      if (error.response?.status === 409) {
        return error.response.data.data;
      }

      if (error.response?.status === 400) {
        toast.error("QR Code format error: " + error.response.data.message);
      } else {
        toast.error(
          "Failed to save bin data: " +
            (error.response?.data?.message || error.message)
        );
      }

      throw error;
    }
  };

  // Function to fetch existing bin data from database
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
      toast.error(
        "Failed to fetch bin data: " +
          (error.response?.data?.message || error.message)
      );
      throw error;
    }
  };

  // Enhanced function to create package in database
  const createPackageInDatabase = async (binNo) => {
    try {
      const response = await api.post("/api/bindata/create-package", {
        binNo: binNo,
        operatorName: operatorName,
        scannedBy: operatorName,
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
      toast.error(
        "Failed to create package: " +
          (error.response?.data?.message || error.message)
      );
      throw error;
    }
  };

  // Function to update scan progress in database
  const updateScanProgress = async (binNo, scannedCount, scanDetails = {}) => {
    try {
      const response = await api.post("/api/bindata/scan-progress", {
        binNo: binNo,
        scannedQuantity: scannedCount,
        scannedBy: operatorName || scanDetails.scannedBy || "user",
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
      toast.error(
        "Failed to update scan progress: " +
          (error.response?.data?.message || error.message)
      );
      throw error;
    }
  };

  // Function to get package count for a part number
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
      toast.error(
        "Failed to fetch invoices: " +
          (error.response?.data?.message || error.message)
      );
      setInvoices([]);
    } finally {
      setLoadingInvoices(false);
    }
  };

  // UPDATED: Enhanced fetch invoice details with part name mapping
  const fetchInvoiceDetails = async (invoiceNumber) => {
    try {
      const response = await api.get(
        `/api/scan/data/search?invoiceNumber=${invoiceNumber}`
      );

      if (response.data.success && response.data.data.length > 0) {
        const invoiceData = response.data.data[0];
        const originalQuantity = parseInt(invoiceData.quantity) || 0;
        const partNo = invoiceData.partNumber || "";
        const partName = getPartNameByPartNo(partNo);
        setInvoicePartDetails({
          partNo: partNo,
          partName: partName,
          quantity: originalQuantity.toString(),
          originalQuantity: originalQuantity.toString(),
          packageCount: 0,
        });

        // Try to fetch saved progress first
        const savedProgress = await fetchInvoiceProgress(invoiceNumber);

        if (savedProgress) {
          // Restore from saved progress
          console.log("Restored progress from backend:", savedProgress);
        } else {
          // Calculate fresh progress
          setRemainingTotalQuantity(originalQuantity);
          setScannedPartsCount(0);
          setCompletedBinCount(0);
          setTotalBinCount(0);

          setInvoiceProgress({
            totalQuantity: originalQuantity,
            scannedQuantity: 0,
            totalBins: 0,
            completedBins: 0,
            remainingQuantity: originalQuantity,
            binSize: 0,
          });
        }

        if (invoiceData.partNumber) {
          await fetchPartPackageCount(invoiceData.partNumber);
        }

        toast.success(
          `Invoice ${invoiceNumber} loaded successfully! Part: ${partName}`
        );
      } else {
        throw new Error("No data found for this invoice");
      }
    } catch (error) {
      console.error("Error fetching invoice details:", error);
      toast.error(
        "Failed to fetch invoice details: " +
          (error.response?.data?.message || error.message)
      );

      // Reset all states
      setInvoicePartDetails({
        partNo: "",
        partName: "",
        quantity: "",
        originalQuantity: "",
        packageCount: 0,
      });
      setRemainingTotalQuantity(0);
      setScannedPartsCount(0);
      setCompletedBinCount(0);
      setTotalBinCount(0);
      setInvoiceProgress({
        totalQuantity: 0,
        scannedQuantity: 0,
        totalBins: 0,
        completedBins: 0,
        remainingQuantity: 0,
        binSize: 0,
      });
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  useEffect(() => {
    if (selectedInvoiceNo && operatorNameRef.current) {
      operatorNameRef.current.focus();
    }
  }, [selectedInvoiceNo]);

  useEffect(() => {
    if (binPartDetails.partNo && scanQuantityRef.current) {
      scanQuantityRef.current.focus();
    }
  }, [binPartDetails.partNo]);

  // Enhanced save package data function
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
      toast.error("Failed to save package data");
      return null;
    }
  };

  // Function to update total counts in database (if needed for reporting)
  const updateCounts = async () => {
    try {
      console.log("Current session counts:", {
        totalPartCount,
        totalPackageCount,
        operatorName,
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

  // Handle invoice change with operator popup
  const handleInvoiceChangeWithPopup = async (e) => {
    const value = e.target.value;

    if (value) {
      setPendingInvoiceNo(value);
      setTempOperatorName("");
      setOperatorDialogOpen(true);
    } else {
      setSelectedInvoiceNo("");
      setOperatorName("");
      resetAllStates();
    }
  };

  // Handle operator name dialog save
  const handleOperatorDialogSave = async () => {
    if (!tempOperatorName.trim()) {
      toast.error("Please enter operator name!");
      return;
    }

    setOperatorName(tempOperatorName.trim());
    setSelectedInvoiceNo(pendingInvoiceNo);

    setOperatorDialogOpen(false);

    await fetchInvoiceDetails(pendingInvoiceNo);

    toast.success(
      `Operator ${tempOperatorName.trim()} assigned to invoice ${pendingInvoiceNo}`
    );

    setPendingInvoiceNo("");
    setTempOperatorName("");
  };

  // Handle operator dialog cancel
  const handleOperatorDialogCancel = () => {
    setOperatorDialogOpen(false);
    setPendingInvoiceNo("");
    setTempOperatorName("");
    setSelectedInvoiceNo("");
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

    // NEW: Reset bin tracking states
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
  };

  const handleInvoiceChange = handleInvoiceChangeWithPopup;

  const handleOperatorNameChange = (e) => {
    setOperatorName(e.target.value);
  };

  // ENHANCED: QR Code processing with strict validation and bin count calculation
  const handleScanQuantityChange = async (e) => {
    const value = e.target.value.trim();
    setScanQuantity(value);

    if (window.qrProcessingTimeout) {
      clearTimeout(window.qrProcessingTimeout);
    }

    const processQRCode = async (value) => {
      if (value && (value.includes("\n") || value.length > 50)) {
        try {
          // ENHANCED: Validate operator name is entered
          if (!operatorName.trim()) {
            toast.error("Please enter operator name first!");
            setScanQuantity("");
            if (operatorNameRef.current) {
              operatorNameRef.current.focus();
            }
            return;
          }

          // ENHANCED: Validate invoice is selected
          if (!selectedInvoiceNo) {
            toast.error("Please select an invoice first!");
            setScanQuantity("");
            return;
          }

          // ENHANCED: Validate invoice part number is loaded
          if (!invoicePartDetails.partNo) {
            toast.error("Invoice part number not loaded!");
            setScanQuantity("");
            return;
          }

          const parsedData = parseQRCodeData(value);

          // ENHANCED: Strict part number validation
          if (
            parsedData.partNumber.trim() !== invoicePartDetails.partNo.trim()
          ) {
            toast.error(
              `Part number mismatch!\nInvoice Part: ${invoicePartDetails.partNo}\nBin Part: ${parsedData.partNumber}\n\nPlease scan the correct bin for this invoice.`,
              { duration: 5000 }
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

          // NEW: Calculate and set bin count if not already set
          if (
            totalBinCount === 0 &&
            invoicePartDetails.originalQuantity &&
            initialBinQuantity
          ) {
            const totalQty = parseInt(invoicePartDetails.originalQuantity);
            const binSize = initialBinQuantity;
            const calculatedBinCount = Math.ceil(totalQty / binSize);

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
          toast.error("Failed to process QR code: " + error.message);
          setScanQuantity("");
        }
      }
    };

    if (!value || value.length < 20) return;

    window.qrProcessingTimeout = setTimeout(async () => {
      await processQRCode(value);
    }, 300);
  };

  // ENHANCED: Machine barcode processing with comprehensive validation
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

  // ENHANCED: Machine barcode processing with strict validation and bin completion logic
  const processMachineBarcode = async (rawValue) => {
    const trimmedValue = rawValue.trim();

    if (!trimmedValue || trimmedValue.length < 8) {
      return;
    }

    // ENHANCED: Validate operator name is entered
    if (!operatorName.trim()) {
      toast.error("Please enter operator name first!");
      setMachineBarcode("");
      if (operatorNameRef.current) {
        operatorNameRef.current.focus();
      }
      return;
    }

    // ENHANCED: Validate invoice and part number matching
    if (!selectedInvoiceNo || !invoicePartDetails.partNo) {
      toast.error("Please select an invoice and load invoice details first!");
      setMachineBarcode("");
      return;
    }

    if (!binPartDetails.partNo) {
      toast.error("Please scan a bin QR code first!");
      setMachineBarcode("");
      return;
    }

    // ENHANCED: Strict part number validation before processing
    const validation = validatePartNumberMatch();
    if (!validation.isValid) {
      toast.error(`Cannot scan parts: ${validation.message}`);
      setMachineBarcode("");
      return;
    }

    try {
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
          toast.error(`Unable to extract part number from barcode`);
          setMachineBarcode("");
          return;
        }
      }

      try {
        parsedData = parseMachineBarcode(trimmedValue);
        extractedSerialNumber = parsedData.Serial_no;
        console.log(
          "Extracted serial number from parsed data:",
          extractedSerialNumber
        );
      } catch (parseError) {
        console.log(
          "Full parsing failed, trying to extract serial number manually"
        );

        const serialMatch = trimmedValue.match(/(\d{4})$/);
        extractedSerialNumber = serialMatch
          ? serialMatch[1]
          : `AUTO_${Date.now()}`;
        console.log(
          "Fallback serial number extraction:",
          extractedSerialNumber
        );
      }

      // ENHANCED: Triple validation - invoice, bin, and scanned part must all match
      const invoicePartNo = invoicePartDetails.partNo?.trim();
      const binPartNo = binPartDetails.partNo?.trim();
      const scannedPartNo = extractedPartNumber?.trim();

      if (invoicePartNo !== binPartNo) {
        toast.error(
          `Invoice and bin part numbers don't match!\nInvoice: ${invoicePartNo}\nBin: ${binPartNo}`
        );
        setMachineBarcode("");
        return;
      }

      if (scannedPartNo !== invoicePartNo) {
        toast.error(
          `Scanned part doesn't match invoice!\nExpected: ${invoicePartNo}\nScanned: ${scannedPartNo}`
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
          operatorName: operatorName,
          totalQuantity: binPartDetails.quantity,
          sessionId: sessionId,
        };

        savePartScanData(partScanData).catch(console.error);

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
              scannedBy: operatorName,
              isValid: true,
              machineData: parsedData,
            }
          );

          if (
            progressResponse.isCompleted ||
            newScannedQuantity >= totalBinQuantity
          ) {
            // NEW: Bin completed - trigger bin completion logic
            await onBinCompleted();

            setStatus("✅ completed");
          } else {
            toast.success(
              `Part scanned! ${newScannedQuantity}/${totalBinQuantity} (${progressPercent}%)`
            );
          }
        } catch (error) {
          toast.success(
            `Part scanned! ${newScannedQuantity}/${totalBinQuantity} (${progressPercent}%)`
          );

          // Even if progress update fails, still handle bin completion
          if (newScannedQuantity >= totalBinQuantity) {
            await onBinCompleted();
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
            operatorName: operatorName,
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
      toast.error("Failed to process barcode");
      setMachineBarcode("");
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

      // NEW: Reset bin tracking
      setCompletedBinCount(0);
      setInvoiceProgress((prev) => ({
        ...prev,
        scannedQuantity: 0,
        completedBins: 0,
        remainingQuantity: prev.totalQuantity,
      }));

      toast.success("All counts reset successfully");
    } catch (error) {
      console.error("Error resetting counts:", error);
      toast.error("Failed to reset counts");
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

      {/* NEW: All Bins Completed Dialog */}
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
                  OPERATOR
                </Typography>
                <Typography variant="h6" fontWeight="600">
                  {operatorName}
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

      {/* Operator Name Dialog */}
      <Dialog
        open={operatorDialogOpen}
        onClose={handleOperatorDialogCancel}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
            border: "1px solid #E3F2FD",
          },
        }}
      >
        <DialogTitle
          sx={{
            bgcolor: "#F8F9FA",
            color: "#2C3E50",
            textAlign: "center",
            py: 3,
            borderBottom: "2px solid #E3F2FD",
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
                bgcolor: "#E3F2FD",
                border: "2px solid #64B5F6",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <PersonIcon sx={{ color: "#1976D2", fontSize: 24 }} />
            </Box>
            <Box>
              <Typography variant="h5" fontWeight="600" color="#2C3E50">
                Operator Assignment
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.7, mt: 0.5 }}>
                Invoice: {pendingInvoiceNo}
              </Typography>
            </Box>
          </Box>
        </DialogTitle>

        <DialogContent sx={{ p: 3 }}>
          <Box sx={{ mb: 2 }}>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
              Please enter or scan the operator name for this scanning session:
            </Typography>

            <TextField
              inputRef={operatorDialogRef}
              label="Operator Name"
              value={tempOperatorName}
              onChange={(e) => setTempOperatorName(e.target.value)}
              fullWidth
              autoFocus
              placeholder="Type name or scan operator barcode/QR"
              size="large"
              sx={{ mb: 2 }}
              InputProps={{
                startAdornment: <QrCode2Icon color="primary" sx={{ mr: 1 }} />,
              }}
              onKeyPress={(e) => {
                if (e.key === "Enter" && tempOperatorName.trim()) {
                  handleOperatorDialogSave();
                }
              }}
            />

            <Box
              sx={{
                p: 2,
                bgcolor: "#F0F8F0",
                borderRadius: 2,
                border: "1px solid #C8E6C9",
              }}
            >
              <Typography variant="body2" color="#2E7D32">
                <strong>Note:</strong> You can either type the operator name or
                scan an operator barcode/QR code. The operator name will be
                recorded with all scanned items for tracking and audit purposes.
              </Typography>
            </Box>
          </Box>
        </DialogContent>

        <DialogActions
          sx={{ p: 3, bgcolor: "#F8F9FA", justifyContent: "space-between" }}
        >
          <Button
            onClick={handleOperatorDialogCancel}
            variant="outlined"
            color="secondary"
            sx={{ px: 3 }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleOperatorDialogSave}
            variant="contained"
            disabled={!tempOperatorName.trim()}
            sx={{
              px: 3,
              bgcolor: "#64B5F6",
              "&:hover": { bgcolor: "#42A5F5" },
            }}
          >
            Assign Operator
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
                Verified by {completionDialogData.operatorName}
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
              <Grid item xs={12} sm={6} md={3}>
                <Box sx={{ textAlign: "center" }}>
                  <Typography
                    variant="caption"
                    color="#78909C"
                    sx={{ textTransform: "uppercase" }}
                  >
                    Operator
                  </Typography>
                  <Typography
                    variant="h6"
                    fontWeight="bold"
                    sx={{ mt: 0.5, color: "#37474F" }}
                  >
                    {completionDialogData.operatorName}
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
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
              <Grid item xs={12} sm={6} md={3}>
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
              <Grid item xs={12} sm={6} md={3}>
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
                    processed by operator {completionDialogData.operatorName}{" "}
                    with all {completionDialogData.totalQuantity} components
                    scanned, verified, and approved for next stage operations.
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

      <style jsx global>{`
        @keyframes pulse {
          0% {
            box-shadow: 0 0 0 0 rgba(76, 175, 80, 0.7);
          }
          70% {
            box-shadow: 0 0 0 10px rgba(76, 175, 80, 0);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(76, 175, 80, 0);
          }
        }
      `}</style>

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
                  {/* NEW: Part Name Field */}
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
                      label="Remaining Quantity"
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
                      disabled={!selectedInvoiceNo || !operatorName.trim()}
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
                          : !operatorName.trim()
                          ? "Enter operator name first"
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
                {operatorName && (
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ mt: 0.5, display: "block" }}
                  >
                    Operator: {operatorName}
                  </Typography>
                )}
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ mt: 0.5, display: "block" }}
                >
                  Session ID: {sessionId}
                </Typography>
              </Paper>
            </Box>
          </Grid>

          {/* Right Column - Statistics */}
          <Grid item xs={12} md={4} sx={{ height: isSmall ? "auto" : "100%" }}>
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                gap: isSmall ? 0.5 : 1,
                height: "100%",
              }}
            >
              {/* Statistics Cards */}
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
                    <Typography variant="h4">
                      {remainingTotalQuantity || 0}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Out of {invoicePartDetails.originalQuantity || 0}
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Paper sx={{ p: { xs: 1, sm: 1.5 }, textAlign: "center" }}>
                    <LocalShippingIcon color="primary" />
                    <Typography variant="body2" color="primary">
                      Bin Quantity
                    </Typography>
                    <Typography variant="h4">
                      {binPartDetails.originalQuantity || 0}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Current bin total quantity
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Paper sx={{ p: { xs: 1, sm: 1.5 }, textAlign: "center" }}>
                    <BackpackIcon color="primary" />
                    <Typography variant="body2" color="primary">
                      Scanned Parts Count
                    </Typography>
                    <Typography variant="h4">{scannedPartsCount}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Total parts scanned
                    </Typography>
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
                  </Paper>
                </Grid>
              </Grid>

              {/* Invoice Info */}
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
                      <strong>Operator:</strong>{" "}
                      {operatorName || "Not assigned"}
                    </Typography>
                    <Typography variant="caption" display="block">
                      <strong>Part:</strong> {invoicePartDetails.partNo}
                    </Typography>
                    <Typography variant="caption" display="block">
                      <strong>Total Qty:</strong>{" "}
                      {invoicePartDetails.originalQuantity}
                    </Typography>
                    <Typography variant="caption" display="block">
                      <strong>Remaining:</strong> {remainingTotalQuantity}
                    </Typography>
                    <Typography variant="caption" display="block">
                      <strong>Scanned:</strong> {scannedPartsCount}
                    </Typography>
                    {totalBinCount > 0 && (
                      <>
                        <Typography variant="caption" display="block">
                          <strong>Total Bins:</strong> {totalBinCount}
                        </Typography>
                        <Typography variant="caption" display="block">
                          <strong>Completed Bins:</strong> {completedBinCount}
                        </Typography>
                        <Typography variant="caption" display="block">
                          <strong>Progress:</strong>{" "}
                          {Math.round(
                            (completedBinCount / totalBinCount) * 100
                          )}
                          %
                        </Typography>
                      </>
                    )}
                  </Box>
                </Paper>
              )}

              {/* Bin Progress Details */}
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
                      <strong>Total Qty:</strong>
                      {binPartDetails.originalQuantity}
                    </Typography>
                    <Typography variant="caption" display="block">
                      <strong>Progress:</strong> {scannedQuantity}/
                      {binPartDetails.quantity} ({progress}%)
                    </Typography>
                    <Typography variant="caption" display="block">
                      <strong>Scanned By:</strong>{" "}
                      {operatorName || "Not assigned"}
                    </Typography>
                    {totalBinCount > 0 && (
                      <>
                        <Typography variant="caption" display="block">
                          <strong>Bin #{completedBinCount + 1}</strong> of{" "}
                          {totalBinCount}
                        </Typography>
                        <Typography variant="caption" display="block">
                          <strong>Overall Progress:</strong>{" "}
                          {Math.round(
                            (completedBinCount / totalBinCount) * 100
                          )}
                          %
                        </Typography>
                      </>
                    )}
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
            </Box>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};

export default Dispatch;
