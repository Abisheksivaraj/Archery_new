import React, { useEffect, useState, useRef } from "react";
import { toast, Toaster } from "react-hot-toast";
import logoIcon from "../assets/companyLogo.png";
import { QRCodeSVG } from "qrcode.react";
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

const User = () => {
  const theme = useTheme();

  // State variables
  const [invoices, setInvoices] = useState([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [selectedInvoiceNo, setSelectedInvoiceNo] = useState("");

  // Separate state for invoice and bin details
  const [invoicePartDetails, setInvoicePartDetails] = useState({
    partNo: "",
    partName: "",
    quantity: "",
    packageCount: 0,
  });

  const [binPartDetails, setBinPartDetails] = useState({
    partNo: "",
    partName: "",
    quantity: "",
  });

  // NEW: Separate state for Part Scanning section (keeps fields empty)
  const [partScanDetails, setPartScanDetails] = useState({
    partNo: "",
    partName: "",
  });

  const [scanQuantity, setScanQuantity] = useState("");
  const [scannedQuantity, setScannedQuantity] = useState(0);
  const [status, setStatus] = useState("⚠️ processing");
  const [totalPartCount, setTotalPartCount] = useState(0);
  const [totalPackageCount, setTotalPackageCount] = useState(0);
  const [previousScanQuantity, setPreviousScanQuantity] = useState("");
  const [trackingRefresh, setTrackingRefresh] = useState(0);
  const [binQuantity, setBinQuantity] = useState("");
  const [machineBarcode, setMachineBarcode] = useState("");
  const [mismatchDialogOpen, setMismatchDialogOpen] = useState(false);
  const [mismatchMessage, setMismatchMessage] = useState("");
  const [currentBinTag, setCurrentBinTag] = useState("");
  const [progress, setProgress] = useState(0);

  // NEW: Session ID for tracking related scans
  const [sessionId] = useState(
    () => `SESSION_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  );

  // Refs
  const scanQuantityRef = useRef(null);
  const machineBarcodeRef = useRef(null);

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
        rawData: rawData, // Store exactly as scanned - NO trimming, NO additional fields
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
      // Don't show error toast - just log it
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
        // Additional context fields
        binNumber: scanData.binNumber,
        invoiceNumber: scanData.invoiceNumber,
        scanTimestamp: scanData.scanTimestamp || new Date().toISOString(),
        scanStatus: scanData.scanStatus, // 'pass', 'fail', 'mismatch'
        rawBarcodeData: scanData.rawBarcodeData,
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

      // Don't show toast error for every scan - log it instead
      if (error.response?.status !== 409) {
        // Skip duplicate errors
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

      // Expected format: L012331100M55T0401082512833
      // Positions: 0-4 (vendor+shift), 5-15 (part number), 16-21 (date), 22+ (quantity+serial)

      if (cleanedText.length < 25) {
        throw new Error(`Barcode too short: ${cleanedText.length} characters`);
      }

      let pos = 0;

      // 1. Vendor Code (L012) - 4 characters
      const vendorCode = cleanedText.substring(pos, pos + 4); // L012
      pos += 4;

      // 2. Shift (3) - 1 character
      const shift = cleanedText.substring(pos, pos + 1); // 3
      pos += 1;

      // 3. Part Number - positions 5-15 (11 characters)
      const partNumber = cleanedText.substring(5, 16); // 31100M55T04
      pos = 16;

      // 4. Date (010825) - 6 characters
      const date = cleanedText.substring(pos, pos + 6); // 010825
      pos += 6;

      // 5. Remaining part contains quantity + serial number
      const remaining = cleanedText.substring(pos);

      // Serial number is last 4 digits
      const serial = remaining.slice(-4); // 2833

      // Quantity is everything except the last 4 digits (usually 1-2 digits)
      const quantityPart = remaining.slice(0, -4);
      const quantity = quantityPart || "1";

      // Validate extracted components
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

      // Create spaced format
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

      // Method 1: Full spaced format parsing (L012 3 31100M55T04 010825 1 2833)
      if (cleanedText.includes(" ")) {
        const parts = cleanedText.split(/\s+/);
        console.log("Split parts:", parts);

        if (parts.length >= 3) {
          const partNumber = parts[2]; // Third component should be part number
          console.log("Extracted part number (spaced format):", partNumber);

          // Validate it's 11 characters
          if (partNumber.length === 11) {
            return partNumber;
          } else {
            console.log(
              `Warning: Part number length is ${partNumber.length}, expected 11`
            );
            // Still return it in case the format is slightly different
            return partNumber;
          }
        }
      }

      // Method 2: Concatenated format parsing (L012331100M55T0401082512833)
      if (cleanedText.length >= 25 && /^[A-Z]\d{3}\d/.test(cleanedText)) {
        try {
          // Extract part number from positions 5-15 (11 characters)
          // Format: L012 3 31100M55T04 010825 1 2833
          // Positions: 0-3=vendor, 4=shift, 5-15=part, 16-21=date, etc.
          const partNumber = cleanedText.substring(5, 16);
          console.log(
            "Extracted part number (concatenated format - positions 5-15):",
            partNumber
          );
          console.log("Part number length:", partNumber.length);

          // Validate the extracted part number
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
        // Exact pattern for your format: 5 digits + letter + 2 digits + letter + 2 digits
        /(\d{5}[A-Z]\d{2}[A-Z]\d{2})/i,

        // More flexible patterns
        /([0-9]{5}[A-Z][0-9]{2}[A-Z][0-9]{2})/i,

        // Even more flexible - any 11-char alphanumeric starting with digits
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

        // Look for substring with same length as reference part number
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

      // Method 5: Last resort - look for any 11-character sequence that could be a part number
      const elevenCharMatches = cleanedText.match(/[A-Z0-9]{11}/gi);
      if (elevenCharMatches && elevenCharMatches.length > 0) {
        console.log("Found 11-character sequences:", elevenCharMatches);

        // Return the first one that looks like a part number (starts with digits)
        for (const match of elevenCharMatches) {
          if (/^\d/.test(match)) {
            console.log(
              "Using 11-character sequence starting with digit:",
              match
            );
            return match;
          }
        }

        // If none start with digits, just return the first one
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
      let quantity = 1; // Default quantity
      let serialNo = "";

      if (cleanedText.includes(" ")) {
        // Full format parsing
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
        // For other concatenated formats - extract what we can
        const vendorMatch = cleanedText.match(/^([A-Z]\d{2,4})/);
        vendorCode = vendorMatch ? vendorMatch[1] : "UNKNOWN";

        // Try to extract shift (usually a single digit after vendor code)
        const shiftMatch = cleanedText.match(/^[A-Z]\d{3}(\d)/);
        shift = shiftMatch ? shiftMatch[1] : "1";

        // Extract date if present (6 digits that look like DDMMYY)
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

        // Generate serial number from last 4 digits or create one
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
      };

      console.log("Parsed Machine Barcode Data:", result);
      return result;
    } catch (error) {
      console.error("Machine Barcode Parsing Error:", error);
      throw new Error(`Failed to parse machine barcode: ${error.message}`);
    }
  };

  // Function to save machine scan data to database
  const saveMachineScanData = async (parsedData) => {
    try {
      console.log("Saving machine scan data to database:", parsedData);

      const response = await api.post("/api/machineScan", {
        vendorCode: parsedData.vendorCode,
        date: parsedData.date,
        partNumber: parsedData.partNumber,
        Serial_no: parsedData.Serial_no,
        staticshift: parsedData.staticshift,
      });

      if (response.data.success) {
        toast.success("Machine scan data saved successfully!");
        return response.data.data;
      } else {
        throw new Error(
          response.data.message || "Failed to save machine scan data"
        );
      }
    } catch (error) {
      console.error("Error saving machine scan data:", error);

      // Handle duplicate serial number
      if (error.response?.status === 409) {
        toast.error("Serial number already exists in database");
        return error.response.data.data;
      }

      toast.error(
        "Failed to save machine scan data: " +
          (error.response?.data?.message || error.message)
      );
      throw error;
    }
  };

  // Updated function to parse QR code data for your specific format
  const parseQRCodeData = (qrCodeText) => {
    try {
      console.log("Parsing QR Code:", qrCodeText);

      // Clean the input - remove extra whitespace but preserve structure
      const cleanedText = qrCodeText.trim();

      // Extract bin number (first 13 digits)
      const binNoMatch = cleanedText.match(/^(\d{13})/);
      if (!binNoMatch) {
        throw new Error(
          "Could not find bin number (expected 13 digits at start)"
        );
      }
      const binNo = binNoMatch[1];

      // Remove bin number and clean remaining text
      let remainingText = cleanedText.substring(13).trim();

      // Extract part number (next 11 characters, may include letters/numbers)
      // Looking for pattern after bin number, accounting for spaces
      const partNoMatch = remainingText.match(/^[\s]*([A-Z0-9]{11})/);
      if (!partNoMatch) {
        throw new Error(
          "Could not find part number (expected 11 characters after bin number)"
        );
      }
      const partNumber = partNoMatch[1];

      // Remove part number and clean
      remainingText = remainingText.substring(partNoMatch[0].length).trim();

      // Extract quantity (should be next digits)
      const quantityMatch = remainingText.match(/^(\d+)/);
      if (!quantityMatch) {
        throw new Error("Could not find quantity");
      }
      const quantity = parseInt(quantityMatch[1]);

      // Remove quantity and clean
      remainingText = remainingText.substring(quantityMatch[0].length).trim();

      // Extract description/part name (everything up to the bin number repeat or date)
      // Look for the pattern where bin number repeats or date appears
      let descriptionOrPartName = "";

      // Try to find where the description ends (usually before bin number repeats or date)
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

      // Clean up description - remove trailing commas, extra spaces
      descriptionOrPartName = descriptionOrPartName.replace(/,$/, "").trim();

      if (!descriptionOrPartName) {
        throw new Error("Could not find description/part name");
      }

      // Extract additional metadata from remaining text
      remainingText = remainingText.substring(endIndex);

      // Extract date
      let date = "";
      const allDateMatches = remainingText.match(/\d{2}\/\d{2}\/\d{2}/g);
      if (allDateMatches && allDateMatches.length > 0) {
        date = allDateMatches[0];
      }

      // Extract invoice-like numbers (long alphanumeric sequences)
      const invoicePattern = /[A-Z0-9]{10,}/g;
      const invoiceMatches = remainingText.match(invoicePattern);
      let invoiceNumber = "";

      if (invoiceMatches) {
        // Get the longest match as it's likely the invoice number
        invoiceNumber = invoiceMatches.reduce(
          (longest, current) =>
            current.length > longest.length ? current : longest,
          ""
        );
      }

      // Validate parsed data
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
        invoiceNumber: invoiceNumber || "UNKNOWN",
        rawQRData: qrCodeText,
      };

      console.log("Parsed QR Data:", result);
      return result;
    } catch (error) {
      console.error("Primary QR Parsing Error:", error);

      // Try alternative parsing method
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

      // Split by significant whitespace gaps (multiple spaces)
      const segments = qrCodeText.trim().split(/\s{2,}/);

      if (segments.length < 4) {
        throw new Error("Insufficient data segments in QR code");
      }

      // First segment should contain bin number (13 digits)
      const binNoMatch = segments[0].match(/(\d{13})/);
      if (!binNoMatch) {
        throw new Error("Could not find bin number in first segment");
      }
      const binNo = binNoMatch[1];

      // Second segment should be part number (11 characters)
      const partNumber = segments[1].trim();
      if (partNumber.length !== 11) {
        throw new Error(
          `Part number length mismatch: expected 11, got ${partNumber.length}`
        );
      }

      // Third segment should be quantity
      const quantity = parseInt(segments[2].trim());
      if (isNaN(quantity)) {
        throw new Error(`Invalid quantity: ${segments[2]}`);
      }

      // Fourth segment starts with description
      let descriptionOrPartName = segments[3];

      // Clean up description
      descriptionOrPartName = descriptionOrPartName
        .replace(/[,\s]+$/, "")
        .trim();

      // Extract additional info from remaining segments
      const remainingText = segments.slice(4).join(" ");

      // Extract date
      const dateMatch = remainingText.match(/\d{2}\/\d{2}\/\d{2}/);
      const date = dateMatch
        ? dateMatch[0]
        : new Date().toLocaleDateString("en-GB");

      // Extract invoice number
      const invoiceMatches = remainingText.match(/[A-Z0-9]{10,}/g);
      const invoiceNumber = invoiceMatches
        ? invoiceMatches.reduce(
            (longest, current) =>
              current.length > longest.length ? current : longest,
            ""
          )
        : "UNKNOWN";

      const result = {
        binNo,
        partNumber,
        quantity,
        descriptionOrPartName,
        date,
        invoiceNumber,
        rawQRData: qrCodeText,
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

  // Function to save bin data to database
  const saveBinDataToDatabase = async (parsedData) => {
    try {
      console.log("Saving bin data to database:", parsedData);

      const response = await api.post("/api/bindata/qr", {
        qrCodeData: parsedData.rawQRData,
      });

      if (response.data.success) {
        toast.success("Bin data saved to database successfully!");
        return response.data.data;
      } else {
        throw new Error(response.data.message || "Failed to save bin data");
      }
    } catch (error) {
      console.error("Error saving bin data:", error);
      console.error("Error response:", error.response?.data);

      // If bin already exists, just return the existing data
      if (error.response?.status === 409) {
        toast.success(
          "Bin already exists in database, loading existing data..."
        );
        return error.response.data.data;
      }

      // Handle parsing errors specifically
      if (error.response?.status === 400) {
        const errorMessage = error.response.data.message;
        if (errorMessage.includes("Failed to parse QR code")) {
          toast.error("QR Code format error: " + errorMessage);
        } else {
          toast.error("Validation error: " + errorMessage);
        }
        console.error("QR parsing failed for data:", parsedData.rawQRData);
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
      });

      if (response.data.success) {
        return response.data;
      } else {
        throw new Error(response.data.message || "Failed to create package");
      }
    } catch (error) {
      // If package already exists, just return existing data
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

  // Function to handle printing
  const handlePrint = (packageData = null) => {
    try {
      const printWindow = window.open("", "_blank");
      const printContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Shipping Label - ${packageData?.packageNo || "Package"}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .label { border: 2px solid #000; padding: 20px; max-width: 400px; }
            .header { text-align: center; font-size: 18px; font-weight: bold; margin-bottom: 15px; }
            .info { margin: 5px 0; }
            .qr-placeholder { border: 1px solid #ccc; width: 100px; height: 100px; margin: 10px auto; display: flex; align-items: center; justify-content: center; }
          </style>
        </head>
        <body>
          <div class="label">
            <div class="header">SHIPPING LABEL</div>
            <div class="info"><strong>Package No:</strong> ${
              packageData?.packageNo || "N/A"
            }</div>
            <div class="info"><strong>Bin No:</strong> ${currentBinTag}</div>
            <div class="info"><strong>Part No:</strong> ${
              binPartDetails.partNo
            }</div>
            <div class="info"><strong>Part Name:</strong> ${
              binPartDetails.partName
            }</div>
            <div class="info"><strong>Quantity:</strong> ${
              binPartDetails.quantity
            }</div>
            <div class="info"><strong>Invoice:</strong> ${selectedInvoiceNo}</div>
            <div class="info"><strong>Date:</strong> ${new Date().toLocaleDateString()}</div>
            <div class="info"><strong>Time:</strong> ${new Date().toLocaleTimeString()}</div>
            <div class="qr-placeholder">QR CODE</div>
          </div>
        </body>
        </html>
      `;

      printWindow.document.write(printContent);
      printWindow.document.close();

      // Wait for content to load then print
      setTimeout(() => {
        printWindow.focus();
        printWindow.print();
        printWindow.close();
      }, 250);
    } catch (error) {
      console.error("Error printing label:", error);
      toast.error("Failed to print shipping label");
    }
  };

  // Function to update scan progress in database
  const updateScanProgress = async (binNo, scannedCount, scanDetails = {}) => {
    try {
      const response = await api.post("/api/bindata/scan-progress", {
        binNo: binNo,
        scannedQuantity: scannedCount,
        scannedBy: scanDetails.scannedBy || "user",
        isValid: scanDetails.isValid !== false,
        mismatchReason: scanDetails.mismatchReason,
        machineData: scanDetails.machineData,
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

      // Get packages for this part number from database
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
      // Don't show error toast as this is not critical
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

  // Fetch invoice details (parts and quantities)
  const fetchInvoiceDetails = async (invoiceNumber) => {
    try {
      const response = await api.get(
        `/api/scan/data/search?invoiceNumber=${invoiceNumber}`
      );

      if (response.data.success && response.data.data.length > 0) {
        const invoiceData = response.data.data[0];

        setInvoicePartDetails({
          partNo: invoiceData.partNumber || "",
          partName: invoiceData.partNumber || "",
          quantity: invoiceData.quantity || "",
          packageCount: 0,
        });

        // Fetch package count if part number exists
        if (invoiceData.partNumber) {
          await fetchPartPackageCount(invoiceData.partNumber);
        }

        toast.success(`Invoice ${invoiceNumber} loaded successfully!`);
      } else {
        throw new Error("No data found for this invoice");
      }
    } catch (error) {
      console.error("Error fetching invoice details:", error);
      toast.error(
        "Failed to fetch invoice details: " +
          (error.response?.data?.message || error.message)
      );

      // Clear details on error
      setInvoicePartDetails({
        partNo: "",
        partName: "",
        quantity: "",
        packageCount: 0,
      });
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

  // Enhanced save package data function
  const savePackageData = async () => {
    try {
      const packageResponse = await createPackageInDatabase(currentBinTag);

      if (packageResponse.success) {
        toast.success(
          `Package ${packageResponse.packageNo} created successfully`
        );

        // Update package count for this part
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
      // This could be used to update daily/shift statistics if needed
      console.log("Current session counts:", {
        totalPartCount,
        totalPackageCount,
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
    // Initialize counts
    setTotalPartCount(0);
    setTotalPackageCount(0);
  }, []);

  const handleInvoiceChange = async (e) => {
    const value = e.target.value;
    setSelectedInvoiceNo(value);

    if (value) {
      await fetchInvoiceDetails(value);
    } else {
      setInvoicePartDetails({
        partNo: "",
        partName: "",
        quantity: "",
        packageCount: 0,
      });
    }

    // Reset other states
    setScannedQuantity(0);
    setScanQuantity("");
    setMachineBarcode("");
    setStatus("⚠️ processing");
    setPreviousScanQuantity("");
    setBinPartDetails({
      partNo: "",
      partName: "",
      quantity: "",
    });
    // IMPORTANT: Reset part scanning details
    setPartScanDetails({
      partNo: "",
      partName: "",
    });
    setBinQuantity("");
    setCurrentBinTag("");
    setProgress(0);
  };

  const handleScanQuantityChange = async (e) => {
    const value = e.target.value.trim();
    setScanQuantity(value);

    // Check if this looks like QR code data (either multiline or very long single line)
    if (value && (value.includes("\n") || value.length > 50)) {
      try {
        const parsedData = parseQRCodeData(value);

        // Validate that the part number matches the selected invoice
        if (
          selectedInvoiceNo &&
          invoicePartDetails.partNo &&
          parsedData.partNumber !== invoicePartDetails.partNo
        ) {
          toast.error(
            `Part number mismatch! Invoice part: ${invoicePartDetails.partNo}, Bin part: ${parsedData.partNumber}`
          );
          setScanQuantity("");
          return;
        }

        // Check if bin already exists in database
        const existingBinData = await fetchExistingBinData(parsedData.binNo);

        let savedBinData;
        if (existingBinData) {
          savedBinData = existingBinData;
          toast.success(
            `Resuming existing bin: ${parsedData.binNo} (${
              existingBinData.scannedQuantity || 0
            }/${existingBinData.quantity} completed)`
          );

          setScannedQuantity(existingBinData.scannedQuantity || 0);
          setProgress(
            Math.round(
              ((existingBinData.scannedQuantity || 0) /
                existingBinData.quantity) *
                100
            )
          );
        } else {
          savedBinData = await saveBinDataToDatabase(parsedData);
          setScannedQuantity(0);
          setProgress(0);
        }

        // Update ONLY bin details state - DON'T update part scanning fields
        setBinPartDetails({
          partNo: savedBinData.partNumber,
          partName: savedBinData.descriptionOrPartName,
          quantity: savedBinData.quantity.toString(),
        });
        setBinQuantity(savedBinData.quantity.toString());
        setCurrentBinTag(savedBinData.binNo);

        // IMPORTANT: Keep part scanning fields empty
        // setPartScanDetails({ partNo: "", partName: "" }); // Already empty, no need to update

        // Check if bin is already completed
        if (savedBinData.status === "completed") {
          toast.success(`Bin ${savedBinData.binNo} is already completed!`);
          setStatus("✅ completed");
        } else {
          toast.success(
            `QR Code scanned! Bin: ${savedBinData.binNo}, Part: ${savedBinData.partNumber}, Qty: ${savedBinData.quantity}`
          );
        }

        // Clear the scan field and focus on machine barcode scanner
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
      return;
    }

    // Legacy bin tag handling (for backward compatibility)
    if (value && value.startsWith("BIN-")) {
      const parts = value.split("-");
      if (parts.length >= 4) {
        const binPartNo = parts[1] + "-" + parts[2] + "-" + parts[3];

        if (binPartNo === invoicePartDetails.partNo) {
          const mockBinQuantity =
            Math.floor(parseInt(invoicePartDetails.quantity) / 5) || 1;

          // Update ONLY bin details - DON'T update part scanning fields
          setBinPartDetails({
            partNo: invoicePartDetails.partNo,
            partName: invoicePartDetails.partName,
            quantity: mockBinQuantity.toString(),
          });
          setBinQuantity(mockBinQuantity.toString());
          setCurrentBinTag(value);

          toast.success(
            `Bin tag scanned! ${invoicePartDetails.partName} - Qty: ${mockBinQuantity}`
          );

          setScanQuantity("");
          setTimeout(() => {
            if (machineBarcodeRef.current) {
              machineBarcodeRef.current.focus();
            }
          }, 100);
        } else {
          toast.error(
            `Bin tag doesn't match selected invoice part! Expected: ${invoicePartDetails.partNo}, Found: ${binPartNo}`
          );
          setScanQuantity("");
        }
      } else {
        toast.error("Invalid bin tag format!");
        setScanQuantity("");
      }
      return;
    }
  };

  // Enhanced handleMachineBarcodeChange - wait for complete barcode before processing
  const handleMachineBarcodeChange = async (e) => {
    const rawValue = e.target.value;
    setMachineBarcode(rawValue);

    // Don't process if empty
    if (!rawValue) return;

    // Clear any existing timeout
    if (window.barcodeTimeout) {
      clearTimeout(window.barcodeTimeout);
    }

    // Wait for scanner to finish - most barcode scanners send data very quickly
    // but we want to ensure we get the complete scan
    window.barcodeTimeout = setTimeout(async () => {
      await processMachineBarcode(rawValue);
    }, 100); // Wait 100ms after last character
  };

  // Separate function to process the complete barcode
  const processMachineBarcode = async (rawValue) => {
    const trimmedValue = rawValue.trim();

    // Don't process if trimmed value is too short
    if (!trimmedValue || trimmedValue.length < 8) {
      console.log(
        "Barcode too short, waiting for more input:",
        trimmedValue.length
      );
      return;
    }

    try {
      // Store raw scan data immediately - the complete scan
      try {
        await storeRawScanData(rawValue);
        console.log("Raw scan data stored successfully");
      } catch (rawStoreError) {
        console.error("Failed to store raw scan data:", rawStoreError);
        // Continue processing even if raw storage fails
      }

      let extractedPartNumber = "";
      let parsedData = null;

      // Enhanced part number extraction with better logging
      try {
        extractedPartNumber = extractPartNumberFromBarcode(trimmedValue);
        console.log("Successfully extracted part number:", extractedPartNumber);
      } catch (extractionError) {
        console.error("Failed to extract part number:", extractionError);
        console.log("Full barcode was:", trimmedValue);

        // If extraction fails, check if this is a legacy single part number scan
        if (
          binPartDetails.partNo &&
          trimmedValue === binPartDetails.partNo.trim()
        ) {
          extractedPartNumber = trimmedValue;
          console.log("Using legacy single part number:", extractedPartNumber);
        } else {
          toast.error(
            `Unable to extract part number from barcode: ${trimmedValue}`
          );
          setMachineBarcode("");
          return;
        }
      }

      // Enhanced part number matching with detailed logging
      console.log("Part number comparison:", {
        expected: binPartDetails.partNo,
        expectedTrimmed: binPartDetails.partNo?.trim(),
        extracted: extractedPartNumber,
        extractedTrimmed: extractedPartNumber?.trim(),
        fullBarcode: trimmedValue,
        isMatch: binPartDetails.partNo?.trim() === extractedPartNumber?.trim(),
      });

      // Check if part number matches the bin part number
      if (
        binPartDetails.partNo &&
        binPartDetails.partNo.trim() === extractedPartNumber.trim()
      ) {
        // Part number matches - proceed with scan
        setPartScanDetails({
          partNo: extractedPartNumber,
          partName: binPartDetails.partName,
        });

        // Try to parse full machine barcode data if possible
        try {
          if (trimmedValue.includes(" ") || trimmedValue.length > 15) {
            parsedData = parseMachineBarcode(trimmedValue);
            await saveMachineScanData(parsedData);
          }
        } catch (parseError) {
          console.log(
            "Full parsing failed, proceeding with part number match:",
            parseError
          );
        }

        // Save core part scan data
        const partScanData = {
          partNumber: extractedPartNumber,
          shift: parsedData?.staticshift || "1",
          serialNumber: parsedData?.Serial_no || `AUTO_${Date.now()}`,
          date:
            parsedData?.date ||
            new Date()
              .toLocaleDateString("en-GB", {
                day: "2-digit",
                month: "2-digit",
                year: "2-digit",
              })
              .replace(/\//g, ""),
          binNumber: currentBinTag,
          invoiceNumber: selectedInvoiceNo,
          scanTimestamp: new Date().toISOString(),
          scanStatus: "pass",
          rawBarcodeData: rawValue,
        };

        savePartScanData(partScanData).catch((error) => {
          console.error("Failed to save part scan data:", error);
        });

        setStatus("pass");
        const newScannedQuantity = scannedQuantity + 1;
        const totalBinQuantity = Number(binPartDetails.quantity);

        setTotalPartCount((prev) => prev + 1);
        setScannedQuantity(newScannedQuantity);

        const progressPercent = Math.round(
          (newScannedQuantity / totalBinQuantity) * 100
        );
        setProgress(progressPercent);

        // Update scan progress in database
        try {
          const progressResponse = await updateScanProgress(
            currentBinTag,
            newScannedQuantity,
            {
              scannedBy: "user",
              isValid: true,
              machineData: parsedData,
              rawBarcodeData: rawValue,
              extractedPartNumber: extractedPartNumber,
            }
          );

          if (progressResponse.isCompleted) {
            toast.success(
              `Bin ${currentBinTag} completed! All ${totalBinQuantity} parts scanned.`
            );
            setStatus("✅ completed");
          } else {
            toast.success(
              `Part scanned! Progress: ${newScannedQuantity}/${totalBinQuantity} (${progressPercent}%)`
            );
          }
        } catch (error) {
          toast.success(
            `Part scanned! Progress: ${newScannedQuantity}/${totalBinQuantity} (${progressPercent}%)`
          );
        }

        setMachineBarcode("");

        // Check if bin is complete
        if (newScannedQuantity >= totalBinQuantity) {
          setTotalPackageCount((prev) => prev + 1);
          toast.success(`Bin ${currentBinTag} completed! Creating package...`);

          const packageData = await savePackageData();
          setScannedQuantity(0);
          setProgress(0);

          setTrackingRefresh((prev) => prev + 1);
          setTimeout(() => {
            handlePrint(packageData);
          }, 500);

          setBinPartDetails({
            partNo: "",
            partName: "",
            quantity: "",
          });
          setPartScanDetails({
            partNo: "",
            partName: "",
          });
          setBinQuantity("");
          setCurrentBinTag("");
          setStatus("⚠️ processing");

          setTimeout(() => {
            if (scanQuantityRef.current) {
              scanQuantityRef.current.focus();
            }
          }, 1000);
        } else {
          setTimeout(() => {
            if (machineBarcodeRef.current) {
              machineBarcodeRef.current.focus();
            }
          }, 100);
        }
      } else if (
        binPartDetails.partNo &&
        binPartDetails.partNo.trim() !== extractedPartNumber.trim()
      ) {
        // Part number mismatch
        const mismatchMsg = `Part number mismatch!\nExpected: "${binPartDetails.partNo.trim()}"\nExtracted: "${extractedPartNumber.trim()}"\nFull Barcode: "${trimmedValue}"`;

        setMismatchMessage(mismatchMsg);
        setMismatchDialogOpen(true);
        setStatus("fail");

        console.error("Part number mismatch details:", {
          expected: binPartDetails.partNo?.trim(),
          extracted: extractedPartNumber?.trim(),
          fullBarcode: trimmedValue,
          rawBarcode: rawValue,
        });

        setTimeout(() => {
          setMachineBarcode("");
          if (machineBarcodeRef.current) {
            machineBarcodeRef.current.focus();
          }
        }, 500);
      } else if (!binPartDetails.partNo) {
        toast.error(
          "Please scan a bin QR code first to set the expected part number"
        );
        setMachineBarcode("");
      }
    } catch (error) {
      console.error("Error processing machine barcode:", error);
      toast.error("Failed to process machine barcode: " + error.message);
      setMachineBarcode("");
    }
  };

  const handleResetAllCounts = async () => {
    try {
      setTotalPartCount(0);
      setTotalPackageCount(0);
      setScannedQuantity(0);
      setProgress(0);
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
        height: "100vh",
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

      {/* Mismatch Dialog */}
      <Dialog open={mismatchDialogOpen} onClose={handleCloseMismatchDialog}>
        <DialogTitle sx={{ color: "error.main" }}>
          Part Number Mismatch
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ whiteSpace: "pre-line" }}>
            {mismatchMessage}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseMismatchDialog} color="primary">
            OK
          </Button>
        </DialogActions>
      </Dialog>

      {/* Header */}
      <Paper
        sx={{ p: 1, bgcolor: "primary.light", color: "primary.contrastText" }}
      >
        <Typography variant="body2" textAlign="center">
          <strong>Invoice Processing System:</strong> Select Invoice → Scan QR
          Code → Scan Parts → Raw Data Auto-Stored
        </Typography>
      </Paper>

      <Container maxWidth="xl" sx={{ flex: 1, py: 1, overflow: "hidden" }}>
        <Grid container spacing={1} sx={{ height: "100%" }}>
          {/* Left Column - Input Forms */}
          <Grid item xs={12} md={8} sx={{ height: "100%" }}>
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                gap: 1,
                height: "100%",
              }}
            >
              {/* Invoice Details */}
              <Paper sx={{ p: 1.5, flexShrink: 0 }}>
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
                <Grid container spacing={2}>
                  <Grid item xs={4}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Invoice No</InputLabel>
                      <Select
                        value={selectedInvoiceNo}
                        onChange={handleInvoiceChange}
                        label="Invoice No"
                        autoFocus
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
                  <Grid item xs={4}>
                    <TextField
                      label="Part No"
                      value={invoicePartDetails.partNo}
                      fullWidth
                      size="small"
                      InputProps={{ readOnly: true }}
                    />
                  </Grid>
                  <Grid item xs={4}>
                    <TextField
                      label="Total Quantity"
                      value={invoicePartDetails.quantity}
                      fullWidth
                      size="small"
                      InputProps={{ readOnly: true }}
                    />
                  </Grid>
                </Grid>
              </Paper>

              {/* Bin Details */}
              <Paper sx={{ p: 1.5, flexShrink: 0 }}>
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
                        color: "success.main",
                        fontWeight: "bold",
                        fontSize: "0.75rem",
                      }}
                    >
                      Current: {currentBinTag}
                    </Typography>
                  )}
                </Box>
                <Grid container spacing={2}>
                  <Grid item xs={4}>
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
                    />
                  </Grid>
                  <Grid item xs={4}>
                    <TextField
                      label="Part No"
                      value={binPartDetails.partNo}
                      fullWidth
                      size="small"
                      InputProps={{ readOnly: true }}
                    />
                  </Grid>
                  <Grid item xs={4}>
                    <TextField
                      label="Bin Qty"
                      value={binQuantity}
                      fullWidth
                      size="small"
                      InputProps={{ readOnly: true }}
                    />
                  </Grid>
                </Grid>
              </Paper>

              {/* Part Details */}
              <Paper sx={{ p: 1.5, flexShrink: 0 }}>
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
                      Part Scanning (Raw Data Auto-Stored)
                    </Typography>
                  </Box>
                  {binPartDetails.partNo && (
                    <Typography variant="body2" color="info.main">
                      {scannedQuantity}/{binPartDetails.quantity} ({progress}%)
                    </Typography>
                  )}
                </Box>
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={4}>
                    <TextField
                      label="Machine Barcode Scanner"
                      inputRef={machineBarcodeRef}
                      value={machineBarcode}
                      onChange={handleMachineBarcodeChange}
                      fullWidth
                      size="small"
                      autoComplete="off"
                      placeholder="Scan: L012331400M52T1001082512833"
                      disabled={!binPartDetails.partNo}
                      helperText="Raw data automatically stored on each scan"
                    />
                  </Grid>
                  <Grid item xs={4}>
                    <TextField
                      label="Part No"
                      value={partScanDetails.partNo}
                      fullWidth
                      size="small"
                      InputProps={{ readOnly: true }}
                    />
                  </Grid>
                  <Grid item xs={4}>
                    <TextField
                      label="Serial Number"
                      value={partScanDetails.partName}
                      fullWidth
                      size="small"
                      InputProps={{ readOnly: true }}
                    />
                  </Grid>
                </Grid>

                {/* Progress Bar */}
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
              <Paper sx={{ p: 1.5, textAlign: "center", flexShrink: 0 }}>
                <Typography
                  variant="h3"
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
              </Paper>
            </Box>
          </Grid>

          {/* Right Column - Statistics */}
          <Grid item xs={12} md={4} sx={{ height: "100%" }}>
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                gap: 1,
                height: "100%",
              }}
            >
              {/* Statistics Cards */}
              <Grid container spacing={1}>
                <Grid item xs={6}>
                  <Paper sx={{ p: 1.5, textAlign: "center" }}>
                    <Tooltip title="Reset all counts" arrow>
                      <IconButton
                        size="small"
                        onClick={() => {
                          if (window.confirm("Reset all counts?")) {
                            handleResetAllCounts();
                          }
                        }}
                      >
                        <InventoryIcon color="primary" />
                      </IconButton>
                    </Tooltip>
                    <Typography variant="body2" color="primary">
                      Total Quantity
                    </Typography>
                    <Typography variant="h4">{totalPartCount}</Typography>
                  </Paper>
                </Grid>
                <Grid item xs={6}>
                  <Paper sx={{ p: 1.5, textAlign: "center" }}>
                    <LocalShippingIcon color="primary" />
                    <Typography variant="body2" color="primary">
                      Bin Quantity
                    </Typography>
                    <Typography variant="h4">{totalPackageCount}</Typography>
                  </Paper>
                </Grid>
                <Grid item xs={6}>
                  <Paper sx={{ p: 1.5, textAlign: "center" }}>
                    <BackpackIcon color="primary" />
                    <Typography variant="body2" color="primary">
                      Total Scanned Part 
                    </Typography>
                    <Typography variant="h4">
                      {invoicePartDetails.packageCount || 0}
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={6}>
                  <Paper sx={{ p: 1.5, textAlign: "center" }}>
                    <QrCodeScannerIcon color="secondary" />
                    <Typography variant="body2" color="primary">
                      Bin Count
                    </Typography>
                    <Typography variant="h4">
                      {binPartDetails.quantity
                        ? `${scannedQuantity}/${binPartDetails.quantity}`
                        : "0/0"}
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>

              {/* Invoice Info */}
              {selectedInvoiceNo && (
                <Paper sx={{ p: 1.5, flexShrink: 0 }}>
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
                      <strong>Total Qty:</strong> {invoicePartDetails.quantity}
                    </Typography>
                  </Box>
                </Paper>
              )}

              {/* Raw Data Info */}
              <Paper sx={{ p: 1.5, flexShrink: 0 }}>
                <Typography variant="body1" color="primary" gutterBottom>
                  💾 Raw Data Storage
                </Typography>
                <Box sx={{ fontSize: "0.75rem" }}>
                  <Typography variant="caption" display="block">
                    <strong>Auto-Storage:</strong> Enabled
                  </Typography>
                  <Typography variant="caption" display="block">
                    <strong>Session:</strong> {sessionId.substring(8, 18)}...
                  </Typography>
                  <Typography variant="caption" display="block">
                    <strong>API Endpoint:</strong> /api/raw-scans
                  </Typography>
                </Box>
              </Paper>

              {/* Refresh Button */}
              <Paper sx={{ p: 1, textAlign: "center" }}>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={fetchInvoices}
                  disabled={loadingInvoices}
                >
                  {loadingInvoices ? "Loading..." : "Refresh Invoices"}
                </Button>
              </Paper>
            </Box>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};

export default User;
