import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import logoIcon from "../assets/companyLogo.png";
import { QRCodeSVG } from "qrcode.react";
import { api } from "../apiConfig";
import {
  Box,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
} from "@mui/material";

// Separate Label component with corrected props
const PartLabel = ({ partNo, logoUrl, partName, quantity }) => {
  const qrCodeValue = JSON.stringify({
    partNo,
    partName,
    quantity,
  });

  const labelStyle = {
    width: "100mm",
    height: "50mm",
    padding: "6mm",
    backgroundColor: "white",
    border: "1px solid #ccc",
    boxSizing: "border-box",
    margin: "0 auto",
    position: "relative",
    display: "flex",
    flexDirection: "column",
  };

  const contentContainerStyle = {
    width: "100%",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: "2mm",
    height: "calc(100% - 12mm)", // Account for logo height and padding
  };

  const textContainerStyle = {
    width: "70%",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-around",
    overflow: "hidden",
  };

  const textStyle = {
    margin: 0,
    fontSize: "3.5mm",
    color: "black",
    fontWeight: "500",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  };

  const qrCodeContainerStyle = {
    width: "25%",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  };

  return (
    <div style={labelStyle} className="print-content">
      <img
        src={logoUrl}
        alt="Company Logo"
        style={{
          width: "25mm",
          height: "10mm",
          objectFit: "contain",
          alignSelf: "center",
        }}
      />

      <div style={contentContainerStyle}>
        <div style={textContainerStyle}>
          <p style={textStyle}>
            PartName: <strong>{partName}</strong>
          </p>
          <p style={textStyle}>
            PartNo: <strong>{partNo}</strong>
          </p>
          <p style={textStyle}>
            Packing Quantity: <strong>{quantity}</strong>
          </p>
        </div>

        <div style={qrCodeContainerStyle}>
          <QRCodeSVG
            value={qrCodeValue}
            size={100}
            level="M"
            style={{ margin: 0 }}
          />
        </div>
      </div>
    </div>
  );
};

const User = () => {
  const [parts, setParts] = useState([]);
  const [selectedPartNo, setSelectedPartNo] = useState("");
  const [selectedPart, setSelectedPart] = useState({
    partName: "",
    quantity: "",
  });
  const [scanQuantity, setScanQuantity] = useState("");
  const [scannedQuantity, setScannedQuantity] = useState(0);
  const [status, setStatus] = useState("⚠️ Processing");
  const [totalPartCount, setTotalPartCount] = useState(0);
  const [totalPackageCount, setTotalPackageCount] = useState(0);
  const [previousScanQuantity, setPreviousScanQuantity] = useState("");
  const [deleteType, setDeleteType] = useState("");

  const scanQuantityRef = useRef(null);

  // Auto-focus effect
  useEffect(() => {
    if (selectedPartNo && scanQuantityRef.current) {
      scanQuantityRef.current.focus();
    }
  }, [selectedPartNo]);

  // Fetch parts data
  useEffect(() => {
    const fetchParts = async () => {
      try {
        const response = await api.get("/getAllParts");
        setParts(response.data.parts);
      } catch (error) {
        console.error("Error fetching parts:", error);
        toast.error("Failed to fetch parts data");
      }
    };

    fetchParts();
  }, []);

  // Update counts
  const updateCounts = async () => {
    try {
      await api.post("/saveCounts", {
        totalPartCount,
        totalPackageCount,
      });
    } catch (error) {
      console.error("Error saving counts:", error);
      toast.error("Failed to save counts");
    }
  };

  useEffect(() => {
    if (totalPartCount !== 0 || totalPackageCount !== 0) {
      updateCounts();
    }
  }, [totalPartCount, totalPackageCount]);

  // Fetch initial counts
  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const response = await api.get("/getCounts");
        if (response.data) {
          setTotalPartCount(response.data.totalPartCount || 0);
          setTotalPackageCount(response.data.totalPackageCount || 0);
        }
      } catch (error) {
        console.error("Error fetching counts:", error);
        toast.error("Failed to fetch counts");
      }
    };

    fetchCounts();
  }, []);

  // Handle printing
  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    printWindow.document.write(`
      <html>
        <head>
          <title>Print Label</title>
          <style>
            @page {
              size: 100mm 50mm;
              margin: 0;
            }
            body {
              margin: 0;
              padding: 0;
            }
            #print-content {
              width: 100%;
              height: 100%;
            }
          </style>
        </head> 
        <body>
          <div id="print-content">
            ${document.querySelector(".print-content").outerHTML}
          </div>
          <script>
            window.onload = function() {
              window.print();
              window.onafterprint = function() {
                window.close();
              };
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Handle part number change
  const handlePartNoChange = (e) => {
    const value = e.target.value;
    setSelectedPartNo(value);
    setScannedQuantity(0);
    setScanQuantity("");
    setStatus("⚠️ Processing");
    setPreviousScanQuantity("");

    const part = parts.find((part) => part.partNo === value);
    if (part) {
      setSelectedPart({
        partName: part.partName,
        quantity: part.quantity,
      });
    } else {
      setSelectedPart({
        partName: "",
        quantity: "",
      });
    }
  };

  // Handle scan quantity change
  const handleScanQuantityChange = (e) => {
    const value = e.target.value;
    setScanQuantity(value);

    if (status === "Fail 🚫") {
      setScanQuantity(value);
      setPreviousScanQuantity("");
    }

    checkStatus(selectedPartNo, value);
  };

  // Check status
  const checkStatus = (partNoValue, scanQuantityValue) => {
    if (String(partNoValue).trim() === String(scanQuantityValue).trim()) {
      setStatus("PASS ✅");
      if (scanQuantityValue !== previousScanQuantity) {
        const newScannedQuantity = scannedQuantity + 1;

        setTotalPartCount((prev) => prev + 1);
        setScanQuantity("");

        if (newScannedQuantity === Number(selectedPart.quantity)) {
          setTotalPackageCount((prev) => prev + 1);
          setScannedQuantity(0);
          setTimeout(() => {
            handlePrint();
          }, 100);
        } else {
          setScannedQuantity(newScannedQuantity);
        }

        setPreviousScanQuantity(scanQuantityValue);
      }
    } else {
      setStatus("Fail 🚫");
      setPreviousScanQuantity("");
      setTimeout(() => {
        setScanQuantity("");
        if (scanQuantityRef.current) {
          scanQuantityRef.current.focus();
        }
      }, 500);
    }
  };

  // Modify just the handleDelete function within the User component:

  const handleDelete = async (type) => {
    try {
      if (type === "parts") {
        await api.post("/deleteTotalParts");
        setTotalPartCount(0);
        setDeleteType("");
        // Fetch updated counts after deletion
        const response = await api.get("/getCounts");
        if (response.data) {
          setTotalPartCount(response.data.totalPartCount || 0);
        }
        toast.success("Total parts count reset successfully");
      } else if (type === "packages") {
        await api.post("/deleteTotalPackages");
        setTotalPackageCount(0);
        setDeleteType("");
        // Fetch updated counts after deletion
        const response = await api.get("/getCounts");
        if (response.data) {
          setTotalPackageCount(response.data.totalPackageCount || 0);
        }
        toast.success("Total packages count reset successfully");
      }
    } catch (error) {
      console.error("Error in deletion:", error);
      toast.error(`Error resetting ${type} count`);
    }
  };

  return (
    <div className=" text-white">
      <div style={{ display: "none" }}>
        <PartLabel
          partNo={selectedPartNo}
          logoUrl={logoIcon}
          partName={selectedPart.partName}
          quantity={selectedPart.quantity}
        />
      </div>

      <div className="">
        <div>
          <h2 className="text-2xl font-semibold text-blue-400 mb-6">
            ⚙️ Part Details
          </h2>
          <Grid
            container
            spacing={3}
            alignItems="center"
            sx={{ display: "flex", gap: 2, padding: "5mm" }}
          >
            {/* Part No and Part Name Section */}
            <FormControl
              fullWidth
              variant="outlined"
              sx={{
                display: "flex",
                gap: 2,
                flexDirection: "row",
                alignItems: "center", // Ensure alignment of elements in the row
                flex: 3, // Adjust flex to manage space allocation
              }}
            >
              <InputLabel id="part-no-label">Part No</InputLabel>
              <Select
                labelId="part-no-label"
                value={selectedPartNo}
                onChange={handlePartNoChange}
                label="Part No"
                autoFocus
                sx={{ flex: 1 }} // Ensure the Select occupies appropriate space
              >
                <MenuItem value="">
                  <em>None</em>
                </MenuItem>
                {parts.map((part) => (
                  <MenuItem key={part._id} value={part.partNo}>
                    {part.partNo}
                  </MenuItem>
                ))}
              </Select>

              <TextField
                id="part-name"
                label="Part Name"
                value={selectedPart.partName}
                InputProps={{
                  readOnly: true,
                }}
                fullWidth
                sx={{ flex: 2 }} // Ensure the TextField occupies appropriate space
              />
            </FormControl>

            {/* Packing Quantity Section */}
            <Box
              display="flex"
              flexDirection="column"
              alignItems="center"
              justifyContent="center"
              sx={{
                textAlign: "center",
                flex: 1, // Adjust flex to manage space allocation
                minWidth: 150, // Optional: set a minimum width for consistent appearance
              }}
            >
              <Typography variant="subtitle1" fontWeight="medium" gutterBottom>
                Packing Quantity
              </Typography>
              <Box
                sx={{
                  backgroundColor: "gray",
                  color: "white",
                  py: 2,
                  px: 4,
                  borderRadius: 2,
                  fontSize: "1.5rem",
                  fontWeight: "bold",
                  boxShadow: 1,
                }}
              >
                {selectedPart.quantity || "0"}
              </Box>
            </Box>
          </Grid>
        </div>

        <div>
          <h2 className="text-2xl font-semibold text-blue-400 mb-6">
            📇 Scan Details
          </h2>
          <Grid container spacing={3}>
            {/* Scan Quantity Section */}
            <Grid item xs={12} md={4}>
              <Typography variant="body1" gutterBottom>
                Scan Quantity
              </Typography>
              <TextField
                type="text"
                inputRef={scanQuantityRef} // MUI uses `inputRef` instead of `ref` for inputs
                value={scanQuantity}
                onChange={handleScanQuantityChange}
                fullWidth
                variant="outlined"
                sx={{
                  borderRadius: 1,
                  "& .MuiOutlinedInput-root": {
                    "& fieldset": {
                      borderColor: "#4b5563", // border-gray-600 equivalent
                    },
                    "&:hover fieldset": {
                      borderColor: "#10b981", // focus:ring-green-500 equivalent
                    },
                    "&.Mui-focused fieldset": {
                      borderColor: "#10b981", // focus state
                    },
                  },
                }}
              />
            </Grid>

            {/* Scanned Quantity Section */}
            <Grid item xs={12} md={4}>
              <Typography variant="body1" gutterBottom>
                Scanned Quantity
              </Typography>
              <Box
                sx={{
                  backgroundColor: "rgba(34, 197, 94, 0.8)", // bg-green-600/80 equivalent
                  color: "white",
                  py: 2,
                  px: 3,
                  borderRadius: 1,
                  fontSize: "1.5rem", // text-2xl equivalent
                  fontWeight: "bold",
                  textAlign: "center",
                  boxShadow: "inset 0px 4px 6px rgba(0, 0, 0, 0.2)", // shadow-inner equivalent
                }}
              >
                {scannedQuantity}
              </Box>
            </Grid>

            {/* Status Section */}
            <Grid item xs={12} md={4}>
              <Typography variant="body1" gutterBottom>
                Status
              </Typography>
              <Box
                sx={{
                  py: 2,
                  px: 3,
                  textAlign: "center",
                  borderRadius: 1,
                  fontSize: "1.5rem", // text-2xl equivalent
                  fontWeight: "bold",
                  boxShadow: "inset 0px 4px 6px rgba(0, 0, 0, 0.2)", // shadow-inner equivalent
                  backgroundColor:
                    status === "PASS ✅"
                      ? "rgba(34, 197, 94, 0.8)" // bg-green-500/80 equivalent
                      : status === "Fail 🚫"
                      ? "rgba(239, 68, 68, 0.8)" // bg-red-500/80 equivalent
                      : "rgba(234, 179, 8, 0.8)", // bg-yellow-500/80 equivalent
                  color: "white",
                }}
              >
                {status}
              </Box>
            </Grid>
          </Grid>
         
          <Grid container spacing={3}>
            {/* Total Part Count Section */}
            <Grid item xs={12} md={6}>
              <Box
                display="flex"
                flexDirection="column"
                alignItems="center"
                textAlign="center"
              >
                <Typography variant="h6" sx={{ color: "blue", mb: 1 }}>
                  Total Part Count
                </Typography>
                <Box
                  onClick={() => {
                    setDeleteType("parts");
                    handleDelete();
                  }}
                  sx={{
                    backgroundColor: "#f07167",
                    color: "white",
                    py: 2,
                    px: 4,
                    borderRadius: 2,
                    fontSize: "1.5rem", // text-2xl equivalent
                    fontWeight: "bold",
                    boxShadow: "inset 0px 4px 6px rgba(0, 0, 0, 0.2)", // shadow-inner equivalent
                    cursor: "pointer",
                    "&:hover": {
                      opacity: 0.9,
                    },
                  }}
                >
                  {totalPartCount}
                </Box>
              </Box>
            </Grid>

            {/* Total Package Count Section */}
            <Grid item xs={12} md={6}>
              <Box
                display="flex"
                flexDirection="column"
                alignItems="center"
                textAlign="center"
              >
                <Typography variant="h6" sx={{ color: "blue", mb: 1 }}>
                  Total Package Count
                </Typography>
                <Box
                  onClick={() => {
                    setDeleteType("packages");
                    handleDelete();
                  }}
                  sx={{
                    backgroundColor: "#00a8aa",
                    color: "white",
                    py: 2,
                    px: 4,
                    borderRadius: 2,
                    fontSize: "1.5rem", // text-2xl equivalent
                    fontWeight: "bold",
                    boxShadow: "inset 0px 4px 6px rgba(0, 0, 0, 0.2)", // shadow-inner equivalent
                    cursor: "pointer",
                    "&:hover": {
                      opacity: 0.9,
                    },
                  }}
                >
                  {totalPackageCount}
                </Box>
              </Box>
            </Grid>
          </Grid>
          ;
        </div>
      </div>
    </div>
  );
};

export default User;
