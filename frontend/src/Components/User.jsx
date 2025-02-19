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
  Typography,
  useTheme,
} from "@mui/material";

import SettingsIcon from "@mui/icons-material/Settings";
import QrCodeScannerIcon from "@mui/icons-material/QrCodeScanner";
import InventoryIcon from "@mui/icons-material/Inventory";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";

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
    height: "calc(100% - 12mm)",
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

  const handleDelete = async (type) => {
    try {
      if (type === "parts") {
        await api.post("/deleteTotalParts");
        setTotalPartCount(0);
        setDeleteType("");

        const response = await api.get("/getCounts");
        if (response.data) {
          setTotalPartCount(response.data.totalPartCount || 0);
        }
        toast.success("Total parts count reset successfully");
      } else if (type === "packages") {
        await api.post("/deleteTotalPackages");
        setTotalPackageCount(0);
        setDeleteType("");

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
    <Box sx={{ height: "10vh", display: "flex", flexDirection: "column" }}>
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
            <PartLabel
              partNo={selectedPartNo}
              logoUrl={logoIcon}
              partName={selectedPart.partName}
              quantity={selectedPart.quantity}
            />
          </Box>

          <Grid container spacing={2} sx={{ height: "10%" }}>
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
