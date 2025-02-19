import React, { useEffect, useState, useRef } from "react";
import { toast } from "react-toastify";
import logoIcon from "../assets/companyLogo.png";
import { QRCodeSVG } from "qrcode.react";
import { api } from "../apiConfig";
import {
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
  Typography,
  useTheme,
} from "@mui/material";
import {
  CheckCircleOutline,
  ErrorOutline,
  WarningAmber,
  Inventory2,
  QrCode2,
  DeleteOutline,
  LocalShipping,
  Settings,
} from "@mui/icons-material";

import SettingsIcon from "@mui/icons-material/Settings";
import QrCodeScannerIcon from "@mui/icons-material/QrCodeScanner";
import InventoryIcon from "@mui/icons-material/Inventory";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";

// Label component with improved styling
const PartLabel = ({ partNo, logoUrl, partName, quantity }) => {
  const qrCodeValue = JSON.stringify({
    partNo,
    partName,
    quantity,
  });

  return (
    <Paper
      elevation={0}
      sx={{
        width: "100mm",
        height: "50mm",
        padding: "6mm",
        border: "1px solid #e0e0e0",
        boxSizing: "border-box",
        margin: "0 auto",
        position: "relative",
        display: "flex",
        flexDirection: "column",
      }}
      className="print-content"
    >
      <Box sx={{ display: "flex", justifyContent: "center", mb: 1 }}>
        <img
          src={logoUrl}
          alt="Company Logo"
          style={{
            width: "25mm",
            height: "10mm",
            objectFit: "contain",
          }}
        />
      </Box>

      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexGrow: 1,
        }}
      >
        <Stack spacing={0.5} sx={{ width: "70%" }}>
          <Typography variant="body2" sx={{ fontWeight: 500 }} noWrap>
            PartName: <strong>{partName}</strong>
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: 500 }} noWrap>
            PartNo: <strong>{partNo}</strong>
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: 500 }} noWrap>
            Packing Quantity: <strong>{quantity}</strong>
          </Typography>
        </Stack>

        <Box sx={{ width: "25%", display: "flex", justifyContent: "center" }}>
          <QRCodeSVG value={qrCodeValue} size={100} level="M" />
        </Box>
      </Box>
    </Paper>
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
  const [status, setStatus] = useState("processing");
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

  // Add this function in your User component
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

  // Add this function to your User component
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
  // Handle part number change
  const handlePartNoChange = (e) => {
    const value = e.target.value;
    setSelectedPartNo(value);
    setScannedQuantity(0);
    setScanQuantity("");
    setStatus("processing");
    setPreviousScanQuantity("");

    const part = parts.find((part) => part.partNo === value);
    if (part) {
      setSelectedPart({
        partName: part.partName,
        quantity: part.quantity,
      });

      // Fetch package count for this part
      fetchPartPackageCount(value);
    } else {
      setSelectedPart({
        partName: "",
        quantity: "",
        packageCount: 0,
      });
    }
  };

  // Handle scan quantity change
  const handleScanQuantityChange = (e) => {
    const value = e.target.value;
    setScanQuantity(value);

    if (status === "fail") {
      setScanQuantity(value);
      setPreviousScanQuantity("");
    }

    checkStatus(selectedPartNo, value);
  };

  // Make checkStatus async
  const checkStatus = async (partNoValue, scanQuantityValue) => {
    if (String(partNoValue).trim() === String(scanQuantityValue).trim()) {
      setStatus("pass");
      if (scanQuantityValue !== previousScanQuantity) {
        const newScannedQuantity = scannedQuantity + 1;

        setTotalPartCount((prev) => prev + 1);
        setScanQuantity("");

        if (newScannedQuantity === Number(selectedPart.quantity)) {
          setTotalPackageCount((prev) => prev + 1);
          // Save package data before resetting
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

  // Helper to render status icon
  const getStatusInfo = () => {
    switch (status) {
      case "pass":
        return {
          icon: <CheckCircleOutline fontSize="large" />,
          color: "success.main",
          text: "PASS",
          bgColor: "success.light",
        };
      case "fail":
        return {
          icon: <ErrorOutline fontSize="large" />,
          color: "error.main",
          text: "FAIL",
          bgColor: "error.light",
        };
      default:
        return {
          icon: <WarningAmber fontSize="large" />,
          color: "warning.main",
          text: "PROCESSING",
          bgColor: "warning.light",
        };
    }
  };

  const statusInfo = getStatusInfo();

  return (
    <Box sx={{ height: "10vh", display: "flex", flexDirection: "column" }}>
      <Box sx={{ height: "10vh" }}>
        <Container maxWidth="lg" sx={{ height: "10%" }}>
          <Box sx={{ display: "none" }}>
            <PartLabel
              partNo={selectedPartNo}
              logoUrl={logoIcon}
              partName={selectedPart.partName}
              quantity={selectedPart.quantity}
            />
          </Box>

          <Grid container spacing={2} sx={{ height: "10%" }}>
            {/* Part Details Section */}
            <Grid item xs={6}>
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
                  <Grid item xs={12} md={8}>
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

                  <Grid item xs={12} md={4}>
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

            {/* Scan Details Section */}
            <Grid item xs={6}>
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
                  <Grid item xs={12} md={6}>
                    <Box sx={{ mb: 2 }}>
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          mb: 1,
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
                  <Grid item xs={12} md={6}>
                    <Paper
                      sx={{
                        p: 2,
                        textAlign: "center",
                        bgcolor:
                          status === "PASS ✅"
                            ? "success.light"
                            : status === "Fail 🚫"
                            ? "error.light"
                            : "warning.light",
                        color: "white",
                      }}
                    >
                      <Typography variant="h5">{status}</Typography>
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

            <Grid item xs={12}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={4}>
                  <Paper
                    sx={{
                      p: 2,
                      textAlign: "center",
                      height: "100%",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "center",
                    }}
                  >
                    <IconButton sx={{ mb: 1 }}>
                      <InventoryIcon color="primary" fontSize="large" />
                    </IconButton>
                    <Typography variant="h6" color="primary" gutterBottom>
                      Total Part Count
                    </Typography>
                    <Typography variant="h4">{totalPartCount}</Typography>
                  </Paper>
                </Grid>

                <Grid item xs={12} sm={4}>
                  <Paper
                    sx={{
                      p: 2,
                      textAlign: "center",
                      height: "100%",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "center",
                    }}
                  >
                    <IconButton sx={{ mb: 1 }}>
                      <LocalShippingIcon color="primary" fontSize="large" />
                    </IconButton>
                    <Typography variant="h6" color="primary" gutterBottom>
                      Current Part Packages
                    </Typography>
                    <Typography variant="h4">
                      {selectedPart.packageCount || 0}
                    </Typography>
                  </Paper>
                </Grid>

                <Grid item xs={12} sm={4}>
                  <Paper
                    sx={{
                      p: 2,
                      textAlign: "center",
                      height: "100%",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "center",
                    }}
                  >
                    <IconButton sx={{ mb: 1 }}>
                      <LocalShippingIcon color="primary" fontSize="large" />
                    </IconButton>
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
