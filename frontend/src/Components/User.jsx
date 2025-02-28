import React, { useEffect, useState, useRef } from "react";
// import { toast } from "react-toastify";
import { toast, Toaster } from "react-hot-toast";
import logoIcon from "../assets/companyLogo.png";
import { QRCodeSVG } from "qrcode.react";
import { api } from "../apiConfig";
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Divider,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  LinearProgress,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Tooltip,
  Typography,
  useTheme,
} from "@mui/material";

import SettingsIcon from "@mui/icons-material/Settings";
import QrCodeScannerIcon from "@mui/icons-material/QrCodeScanner";
import InventoryIcon from "@mui/icons-material/Inventory";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import BackpackIcon from "@mui/icons-material/Backpack";

const ShippingLabel = ({
  partNo,
  logoUrl,
  partName,
  quantity,
  sender,
  receiver,
}) => {
  const [labelSize, setLabelSize] = useState("");

  const fetchLabelSize = async () => {
    try {
      console.log("Fetching label size for partNo:", partNo);

      const response = await api.get(`/getLabelSize/${partNo}`);
      console.log("API Response:", response.data); // Log API response

      const sizeInInchesStr = response.data.labelSize; // e.g., "4 inch" or "6 inch"
      console.log("Label Size (String):", sizeInInchesStr);

      // Extract the numeric value from the string
      const inches = parseInt(sizeInInchesStr);
      console.log("Label Size (Parsed Inches):", inches);

      // Set width based on the label size
      let width;
      if (inches === 4) {
        width = 100; // 4-inch label: fixed width of 100mm
      } else if (inches === 6) {
        width = 150; // 6-inch label: fixed width of 150mm (adjust if needed)
      } else {
        // Fallback in case the value is something else
        width = 100;
      }

      // Calculate the height in millimeters (1 inch = 25.4 mm)
      const height = inches * 25.4;

      console.log("Final Label Size:", {
        width: `${width}mm`,
        height: `${height}mm`,
      });

      setLabelSize({ width: `${width}mm`, height: `${height}mm` });
    } catch (error) {
      console.error("Error fetching label size:", error);
    }
  };

  useEffect(() => {
    fetchLabelSize();
  }, [partNo]);

  const generateTrackingNumber = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let trackingNumber = "";
    for (let i = 0; i < 10; i++) {
      trackingNumber += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return trackingNumber;
  };

  const [trackingNo, setTrackingNo] = useState("");

  useEffect(() => {
    setTrackingNo(generateTrackingNumber());
  }, []);

  const qrCodeValue = JSON.stringify({
    partNo,
    partName,
    quantity,
    trackingNo,
  });

  const labelStyle = {
    width: labelSize.width,
    height: labelSize.height,
    padding: "6mm",
    backgroundColor: "white",
    border: "1px solid black",
    boxSizing: "border-box",
    margin: "0 auto",
    display: "flex",
    flexDirection: "column",
    fontSize: "3.5mm",
    fontFamily: "Arial, sans-serif",
  };

  const sectionStyle = {
    borderBottom: "1px dashed black",
    paddingBottom: "3mm",
    marginBottom: "3mm",
  };

  const contentStyle = {
    display: "flex",
    justifyContent: "space-between",
  };

  return (
    <div style={labelStyle} className="print-content">
      {/* Logo Section */}
      <div style={{ textAlign: "center" }}>
        <img
          src={logoUrl}
          alt="Company Logo"
          style={{ width: "full", height: "12mm", objectFit: "contain" }}
        />
      </div>

      {/* Sender Details */}
      <div style={sectionStyle}>
        <strong>From:</strong>
        <p style={{ margin: 0 }}>{sender.name}</p>
        <p style={{ margin: 0 }}>{sender.address}</p>
      </div>

      {/* Receiver Details */}
      <div style={sectionStyle}>
        <strong>To:</strong>
        <p style={{ margin: 0 }}>{receiver.name}</p>
        <p style={{ margin: 0 }}>{receiver.address}</p>
      </div>

      {/* Item Details */}
      <div style={sectionStyle}>
        <p style={{ margin: "2mm 0" }}>
          Part Name: <strong>{partName}</strong>
        </p>
        <p style={{ margin: "2mm 0" }}>
          Part No: <strong>{partNo}</strong>
        </p>
        <p style={{ margin: "2mm 0" }}>
          Packing Quantity: <strong>{quantity}</strong>
        </p>
      </div>

      {/* Tracking and QR Code */}
      <div style={contentStyle}>
        <div>
          <p style={{ margin: "2mm 0" }}>
            Tracking No: <strong>{trackingNo}</strong>
          </p>
        </div>
        <QRCodeSVG value={qrCodeValue} size={80} level="M" />
      </div>
    </div>
  );
};

// Example Usage
const senderInfo = {
  name: "ARCHERY TECHNOCRATS PRIVATE LIMITED",
  address: "275/11, Ganshi Road, West Tambaram, Chennai, Tamil Nadu - 600045",
};

const receiverInfo = {
  name: "John Doe",
  address: "123 Industrial Area, Mumbai, Maharashtra - 400001",
};

const CustomAlert = ({ title, message, type }) => (
  <Alert
    severity={type}
    sx={{
      width: "100%",
      "& .MuiAlert-message": {
        width: "100%",
      },
    }}
  >
    <AlertTitle sx={{ fontWeight: "bold" }}>{title}</AlertTitle>
    <Typography sx={{ fontWeight: 500 }}>{message}</Typography>
  </Alert>
);

const showAlert = (title, message, type) => {
  toast.custom(
    (t) => <CustomAlert title={title} message={message} type={type} />,
    {
      duration: 4000,
      position: "top-right",
    }
  );
};

const User = () => {
  const theme = useTheme();

  const [parts, setParts] = useState([]);
  const [selectedPartNo, setSelectedPartNo] = useState("");
  const [selectedPart, setSelectedPart] = useState({
    partName: "",
    quantity: "",
  });
  const [scanQuantity, setScanQuantity] = useState("");
  const [scannedQuantity, setScannedQuantity] = useState(0);
  const [status, setStatus] = useState("⚠️ processing");
  const [totalPartCount, setTotalPartCount] = useState(0);
  const [totalPackageCount, setTotalPackageCount] = useState(0);
  const [previousScanQuantity, setPreviousScanQuantity] = useState("");
  const [deleteType, setDeleteType] = useState("");

  const scanQuantityRef = useRef(null);

  useEffect(() => {
    if (selectedPartNo && scanQuantityRef.current) {
      scanQuantityRef.current.focus();
    }
  }, [selectedPartNo]);

  const savePackageData = async () => {
    try {
      const response = await api.post("/savePackage", {
        partNo: selectedPartNo,
        partName: selectedPart.partName,
        productionQuantity: selectedPart.quantity,
        scannedQuantity: Number(selectedPart.quantity),
      });

      if (response.data.success) {
        // Display the new package number
        toast.success(`Package ${response.data.newPkgNo} created successfully`);

        // If you want to update the current part's package count in the UI
        setSelectedPart((prev) => ({
          ...prev,
          packageCount: response.data.data.packageCount,
        }));
      }
    } catch (error) {
      console.error("Error saving package data:", error);
      toast.error("Failed to save package data");
    }
  };

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

  const fetchPartPackageCount = async (partNo) => {
    try {
      if (!partNo) return;

      const response = await api.get(`/getPackageCount/${partNo}`);
      if (response.data.success) {
        setSelectedPart((prev) => ({
          ...prev,
          packageCount: response.data.packageCount,
        }));
      }
    } catch (error) {
      console.error("Error fetching package count:", error);
      toast.error("Failed to fetch package count");
    }
  };

  useEffect(() => {
    if (totalPartCount !== 0 || totalPackageCount !== 0) {
      updateCounts();
    }
  }, [totalPartCount, totalPackageCount]);

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

  const handlePartNoChange = (e) => {
    const value = e.target.value;
    setSelectedPartNo(value);
    setScannedQuantity(0);
    setScanQuantity("");
    setStatus("⚠️ processing");
    setPreviousScanQuantity("");

    const part = parts.find((part) => part.partNo === value);
    if (part) {
      setSelectedPart({
        partName: part.partName,
        quantity: part.quantity,
      });

      showAlert(
        `Once the scan quantity reaches  ${part.quantity}, the label will be automatically printed.`
      );

      fetchPartPackageCount(value);
    } else {
      setSelectedPart({
        partName: "",
        quantity: "",
        packageCount: 0,
      });
    }
  };

  const handleScanQuantityChange = (e) => {
    const value = e.target.value;
    setScanQuantity(value);

    if (status === "fail") {
      setScanQuantity(value);
      setPreviousScanQuantity("");
    }

    checkStatus(selectedPartNo, value);
  };

  const checkStatus = async (partNoValue, scanQuantityValue) => {
    if (String(partNoValue).trim() === String(scanQuantityValue).trim()) {
      setStatus("pass");
      if (scanQuantityValue !== previousScanQuantity) {
        const newScannedQuantity = scannedQuantity + 1;

        setTotalPartCount((prev) => prev + 1);
        setScanQuantity("");

        if (newScannedQuantity === Number(selectedPart.quantity)) {
          setTotalPackageCount((prev) => prev + 1);

          await savePackageData();
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
      setStatus("fail");
      setPreviousScanQuantity("");
      setTimeout(() => {
        setScanQuantity("");
        if (scanQuantityRef.current) {
          scanQuantityRef.current.focus();
        }
      }, 500);
    }
  };

  const handleResetAllCounts = async () => {
    try {
      const response = await api.post("/deleteAllCounts");
      if (response.data.counts) {
        setTotalPartCount(0);
        setTotalPackageCount(0);
        toast.success("All counts reset successfully");
      }
    } catch (error) {
      console.error("Error resetting counts:", error);
      toast.error("Failed to reset counts");
    }
  };

  return (
    <Box
      sx={{
        height: "10vh",
        display: "flex",
        overflowY: {
          xs: "auto",
          sm: "auto",
          md: "visible",
        },
        height: {
          xs: "100vh",
          sm: "100vh",
          md: "auto",
        },
        WebkitOverflowScrolling: {
          xs: "touch",
          sm: "touch",
          md: "auto",
        },
        flexDirection: "column",
      }}
    >
      <Toaster
        position="top-right"
        toastOptions={{
          custom: {
            duration: 4000,
          },
        }}
      />

      <Box sx={{ height: "10vh" }}>
        <Container maxWidth="lg" sx={{ height: "10%" }}>
          <Box sx={{ display: "none" }}>
            <ShippingLabel
              partNo={selectedPartNo}
              logoUrl={logoIcon}
              partName={selectedPart.partName}
              quantity={selectedPart.quantity}
              sender={senderInfo}
              receiver={receiverInfo}
            />
          </Box>

          <Grid container spacing={2} sx={{ height: "10%" }}>
            <Grid
              item
              xs={12}
              sm={6}
              md={6}
              sx={{ mb: { xs: 2, sm: 2, md: 0 } }}
            >
              <Paper sx={{ p: 2, height: "100%" }}>
                <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                  <IconButton size="small" sx={{ mr: 1 }}>
                    <SettingsIcon color="primary" />
                  </IconButton>
                  <Typography variant="h6" color="primary">
                    Part Details
                  </Typography>
                </Box>

                <Grid container spacing={2}>
                  <Grid item xs={12} sm={12} md={8}>
                    <FormControl fullWidth>
                      <InputLabel>Part No</InputLabel>
                      <Select
                        value={selectedPartNo}
                        onChange={handlePartNoChange}
                        label="Part No"
                        autoFocus
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
                    </FormControl>
                  </Grid>

                  <Grid item xs={12} sm={12} md={4}>
                    <Paper
                      variant="outlined"
                      sx={{ p: 2, textAlign: "center" }}
                    >
                      <Typography variant="subtitle2" color="text.secondary">
                        Packing Quantity
                      </Typography>
                      <Typography variant="h4" color="primary" sx={{ mt: 1 }}>
                        {selectedPart.quantity || "0"}
                      </Typography>
                    </Paper>
                  </Grid>

                  <Grid item xs={12}>
                    <TextField
                      label="Part Name"
                      value={selectedPart.partName}
                      fullWidth
                      InputProps={{ readOnly: true }}
                    />
                  </Grid>
                </Grid>
              </Paper>
            </Grid>

            <Grid
              item
              xs={12} // Full width on xs
              sm={6} // Full width on sm
              md={6} // Half width on md and up
            >
              <Paper sx={{ p: 2, height: "100%" }}>
                <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                  <IconButton size="small" sx={{ mr: 1 }}>
                    <QrCodeScannerIcon color="primary" />
                  </IconButton>
                  <Typography variant="h6" color="primary">
                    Scan Details
                  </Typography>
                </Box>

                <Grid container spacing={2}>
                  <Grid item xs={12} sm={12} md={6}>
                    <Box sx={{ mb: 2 }}>
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          mb: 1,
                          flexDirection: {
                            xs: "column",
                            sm: "column",
                            md: "row",
                          },
                        }}
                      >
                        <Typography variant="subtitle1" color="text.secondary">
                          Current Package Progress
                        </Typography>
                        <Typography
                          variant="subtitle1"
                          color="primary"
                          sx={{ fontWeight: "medium" }}
                        >
                          {scannedQuantity} / {selectedPart.quantity || 0}
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={
                          selectedPart.quantity
                            ? (scannedQuantity /
                                Number(selectedPart.quantity)) *
                              100
                            : 0
                        }
                        sx={{
                          height: 8,
                          borderRadius: 1,
                          backgroundColor: "grey.200",
                          "& .MuiLinearProgress-bar": {
                            backgroundColor: "primary.main",
                          },
                        }}
                      />
                    </Box>
                  </Grid>

                  <Grid item xs={12} sm={12} md={6}>
                    <Paper
                      sx={{
                        p: 2,
                        textAlign: "center",
                        bgcolor:
                          status === "pass"
                            ? "#4CAF50"
                            : status === "fail"
                            ? "#F44336"
                            : "#eab308cc",
                        color: "white",
                      }}
                    >
                      <Typography variant="h5">
                        {status === "pass"
                          ? "✅ Pass"
                          : status === "fail"
                          ? "🚫 Fail"
                          : "⚠️ Processing"}
                      </Typography>
                    </Paper>
                  </Grid>

                  <Grid item xs={12}>
                    <TextField
                      label="Scan Quantity"
                      inputRef={scanQuantityRef}
                      value={scanQuantity}
                      onChange={handleScanQuantityChange}
                      fullWidth
                      autoComplete="off"
                    />
                  </Grid>
                </Grid>
              </Paper>
            </Grid>

            {/* Statistics Cards */}
            <Grid item xs={12}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={12} md={4}>
                  <Paper
                    sx={{
                      p: 2,
                      textAlign: "center",
                      height: { xs: "auto", sm: "auto", md: "100%" },
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "center",
                      mb: { xs: 2, sm: 2, md: 0 },
                    }}
                  >
                    <Tooltip title="Reset all package counts" arrow>
                      <IconButton
                        sx={{
                          mb: 1,
                          borderRadius: "100%",
                          width: "56px",
                          height: "56px",
                        }}
                        onClick={() => {
                          if (
                            window.confirm(
                              "Are you sure you want to reset all counts?"
                            )
                          ) {
                            handleResetAllCounts();
                          }
                        }}
                      >
                        <InventoryIcon color="primary" fontSize="large" />
                      </IconButton>
                    </Tooltip>
                    <Typography variant="h6" color="primary" gutterBottom>
                      Total Part Count
                    </Typography>
                    <Typography variant="h4">{totalPartCount}</Typography>
                  </Paper>
                </Grid>

                <Grid item xs={12} sm={12} md={4}>
                  <Paper
                    sx={{
                      p: 2,
                      textAlign: "center",
                      height: { xs: "auto", sm: "auto", md: "100%" },
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "center",
                      mb: { xs: 2, sm: 2, md: 0 },
                    }}
                  >
                    <IconButton
                      sx={{
                        mb: 1,
                        borderRadius: "50%",
                        width: "56px",
                        height: "56px",
                      }}
                    >
                      <BackpackIcon color="primary" fontSize="large" />
                    </IconButton>
                    <Typography variant="h6" color="primary" gutterBottom>
                      Current Part Packages
                    </Typography>
                    <Typography variant="h4">
                      {selectedPart.packageCount || 0}
                    </Typography>
                  </Paper>
                </Grid>

                <Grid item xs={12} sm={12} md={4}>
                  <Paper
                    sx={{
                      p: 2,
                      textAlign: "center",
                      height: { xs: "auto", sm: "auto", md: "100%" },
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "center",
                    }}
                  >
                    <Tooltip title="Reset all package counts" arrow>
                      <IconButton
                        sx={{
                          mb: 1,
                          borderRadius: "50%",
                          width: "56px",
                          height: "56px",
                        }}
                        onClick={() => {
                          if (
                            window.confirm(
                              "Are you sure you want to reset all counts?"
                            )
                          ) {
                            handleResetAllCounts();
                          }
                        }}
                      >
                        <LocalShippingIcon color="primary" fontSize="large" />
                      </IconButton>
                    </Tooltip>
                    <Typography variant="h6" color="primary" gutterBottom>
                      Total Package Count
                    </Typography>
                    <Typography variant="h4">{totalPackageCount}</Typography>
                  </Paper>
                </Grid>
              </Grid>
            </Grid>
          </Grid>
        </Container>
      </Box>
    </Box>
  );
};

export default User;
