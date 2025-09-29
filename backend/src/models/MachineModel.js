// models/RawScan.js - Enhanced model with both raw and parsed data
const mongoose = require("mongoose");

const rawScanSchema = new mongoose.Schema(
  {
    // Store original raw data
    rawData: {
      type: String,
      required: true,
    },

    // Parsed fields - automatically populated
    parsedData: {
      vendorCode: {
        type: String,
        default: null,
      },
      time: {
        type: Number,
        default: null,
      },
      partNo: {
        type: String,
        default: null,
      },
      date: {
        type: String,
        default: null,
      },
      shift: {
        type: Number,
        default: null,
      },
      serialNo: {
        type: Number,
        default: null,
      },
    },

    // Track parsing status
    parseStatus: {
      type: String,
      enum: ["pending", "success", "failed"],
      default: "pending",
    },

    parseErrors: [
      {
        field: String,
        error: String,
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Pre-save middleware to automatically parse raw data
rawScanSchema.pre("save", function (next) {
  // Only parse if this is a new document or rawData has changed
  if (this.isNew || this.isModified("rawData")) {
    try {
      const parsed = parseRawData(this.rawData);
      this.parsedData = parsed.data;
      this.parseStatus = parsed.success ? "success" : "failed";
      this.parseErrors = parsed.errors || [];
    } catch (error) {
      this.parseStatus = "failed";
      this.parseErrors = [{ field: "general", error: error.message }];
    }
  }
  next();
});

// Function to parse raw scan data
function parseRawData(rawData) {
  const result = {
    success: true,
    data: {},
    errors: [],
  };

  try {
    // First, try to parse space-separated format: "L012 3 31100M55T04 010825 1 2790"
    const spaceSeparatedPattern =
      /^([A-Z]\d+)\s+(\d+)\s+([A-Z0-9]+)\s+(\d+)\s+(\d+)\s+(\d+)$/;
    const spaceMatch = rawData.trim().match(spaceSeparatedPattern);

    if (spaceMatch) {
      // Parse space-separated format
      const [, vendorCode, time, partNo, date, shift, serialNo] = spaceMatch;

      result.data.vendorCode = vendorCode;
      result.data.time = parseInt(time);
      result.data.partNo = partNo;
      result.data.date = date;
      result.data.shift = parseInt(shift);
      result.data.serialNo = parseInt(serialNo);

      console.log("Parsed space-separated format successfully");
      return result;
    }

    // If space-separated doesn't work, try key-value pair format
    const lines = rawData
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line);

    for (const line of lines) {
      // Parse each line looking for key-value pairs with " - " separator
      if (line.includes(" - ")) {
        const [key, value] = line.split(" - ").map((s) => s.trim());

        switch (key.toLowerCase()) {
          case "vendor code":
            result.data.vendorCode = value;
            break;

          case "time":
            const timeNum = parseInt(value);
            if (!isNaN(timeNum)) {
              result.data.time = timeNum;
            } else {
              result.errors.push({
                field: "time",
                error: `Invalid time value: ${value}`,
              });
            }
            break;

          case "part no":
            result.data.partNo = value;
            break;

          case "date":
            result.data.date = value;
            break;

          case "shift":
            const shiftNum = parseInt(value);
            if (!isNaN(shiftNum)) {
              result.data.shift = shiftNum;
            } else {
              result.errors.push({
                field: "shift",
                error: `Invalid shift value: ${value}`,
              });
            }
            break;

          case "serial no":
            const serialNum = parseInt(value);
            if (!isNaN(serialNum)) {
              result.data.serialNo = serialNum;
            } else {
              result.errors.push({
                field: "serialNo",
                error: `Invalid serial number: ${value}`,
              });
            }
            break;

          default:
            console.warn(`Unknown field in raw data: ${key}`);
        }
      }
    }

    // Check if we successfully parsed anything
    if (Object.keys(result.data).length === 0) {
      result.success = false;
      result.errors.push({
        field: "general",
        error: `No parseable data found. Expected format: "L012 3 31100M55T04 010825 1 2790" or key-value pairs with " - " separator. Received: "${rawData.substring(
          0,
          100
        )}"`,
      });
    } else {
      console.log("Parsed key-value format successfully");
    }
  } catch (error) {
    result.success = false;
    result.errors.push({ field: "general", error: error.message });
  }

  return result;
}

// Add index for efficient querying on parsed fields
rawScanSchema.index({ "parsedData.vendorCode": 1 });
rawScanSchema.index({ "parsedData.partNo": 1 });
rawScanSchema.index({ "parsedData.date": 1 });
rawScanSchema.index({ "parsedData.shift": 1 });
rawScanSchema.index({ parseStatus: 1 });
rawScanSchema.index({ partNumber: 1, serialNumber: 1 });

module.exports = mongoose.model("RawScanData", rawScanSchema);
