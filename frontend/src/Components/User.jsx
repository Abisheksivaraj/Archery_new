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
} from "@mui/material";

import SettingsIcon from "@mui/icons-material/Settings";
import QrCodeScannerIcon from "@mui/icons-material/QrCodeScanner";
import InventoryIcon from "@mui/icons-material/Inventory";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import BackpackIcon from "@mui/icons-material/Backpack";
import Barcode from "react-barcode";
import matrix from "../assets/dataMatrix.gif";
import pdf417 from "../assets/pdf417.gif";

const ShippingLabel = ({
  partNo,
  logoUrl,
  partName,
  quantity,
  sender,
  receiver,
  refreshTrackingNumbers,
}) => {
  const [orderNo, setOrderNo] = useState("");
  const [trackingNo, setTrackingNo] = useState("");
  const [labelSize, setLabelSize] = useState({
    width: "100mm",
    height: "150mm",
  });

  const fetchLabelSize = async () => {
    try {
      console.log("Fetching label size for partNo:", partNo);
      const response = await api.get(`/getLabelSize/${partNo}`);
      console.log("API Response:", response.data);
      const sizeInInchesStr = response.data.labelSize;
      console.log("Label Size (String):", sizeInInchesStr);
      const inches = parseInt(sizeInInchesStr);
      console.log("Label Size (Parsed Inches):", inches);

      let width, height;
      if (inches === 4) {
        width = 100;
        height = 150;
      } else if (inches === 6) {
        width = 150;
        height = 150;
      } else {
        width = 100;
        height = 150;
      }

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

  useEffect(() => {
    setOrderNo(generateOrderNumber());
    setTrackingNo(generateTrackingNumber());
  }, [partNo, refreshTrackingNumbers]);

  const qrCodeValue = JSON.stringify({
    partNo,
    partName,
    quantity,
    trackingNo,
    orderNo,
    timestamp: new Date().toISOString(),
  });

  const barcodeValue = JSON.stringify({
    quantity,
  });

  const addressQr = `${sender.name}, ${sender.address}`;

  const containerStyle = {
    padding: "10mm",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    pageBreakInside: "avoid",
  };

  const labelStyle = {
    width: labelSize.width,
    height: labelSize.height,
    backgroundColor: "white",
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    fontSize: "3mm",
    fontFamily: "Arial, sans-serif",
    position: "relative",
    border: "6px solid #0000FF",
    padding: "8mm",
    margin: "0",
    pageBreakInside: "avoid",
    boxShadow: "0 0 5px rgba(0,0,0,0.1)",
  };

  const sectionStyle = {
    borderBottom: "2px solid red",
    paddingBottom: "3mm",
    marginBottom: "3mm",
  };

  const flexContainerWithBorder = {
    display: "flex",
    justifyContent: "space-between",
    borderBottom: "2px solid red",
    paddingBottom: "3mm",
    marginBottom: "3mm",
  };

  const dividerStyle = {
    borderLeft: "2px solid red",
    marginLeft: "3mm",
    paddingLeft: "3mm",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };

  const codeContainerStyle = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: "3mm",
    marginBottom: "3mm",
    width: "100%",
  };

  const codeStyle = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
  };

  return (
    <div style={containerStyle} className="print-container">
      <div style={labelStyle} className="print-content">
        <div style={{ ...sectionStyle, textAlign: "center" }}>
          <img
            src={logoUrl}
            alt="Company Logo"
            style={{ height: "12mm", objectFit: "contain" }}
          />
        </div>

        <div style={flexContainerWithBorder}>
          <div style={{ width: "70%" }}>
            <strong>From:</strong>
            <div>{sender.name}</div>
            <div>{sender.address}</div>
          </div>
          <div style={dividerStyle}>
            <img
              src={matrix}
              alt="Matrix Code"
              style={{ width: "20mm", height: "20mm" }}
            />
          </div>
        </div>

        <div style={flexContainerWithBorder}>
          <div style={{ width: "60%" }}>
            <strong>Ship To:</strong>
            <div>{receiver.name}</div>
            <div>{receiver.address}</div>
          </div>
          <div style={dividerStyle}>
            <div>
              <div>
                <strong>Ship Date:</strong>
                <p>
                  {new Date().toLocaleDateString("en-US", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </p>
              </div>
              <div>
                <strong>Act weight:</strong> 25 Kg
              </div>
              <div>CAD1319865X2NJX2</div>
            </div>
          </div>
        </div>

        <div
          style={{
            display: "flex",

            justifyContent: "space-between",
            paddingBottom: "3mm",
            marginBottom: "3mm",
          }}
        >
          <div>
            <strong>Order No:</strong> <span>{orderNo}</span>
          </div>
          <div
            style={{
              paddingRight: "3mm",
              paddingLeft: "3mm",
              width: "33%",
              textAlign: "center",
            }}
          >
            <strong>Reference No:</strong> {trackingNo}
          </div>
          <div style={{ paddingLeft: "3mm", width: "33%", textAlign: "right" }}>
            <strong>Net weight:</strong>
            25 Kg/Box
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            marginBottom: "3mm",
            paddingBottom: "3mm",
          }}
        >
          <img
            src={pdf417}
            alt="PDF417 Barcode"
            style={{ width: "80mm", height: "15mm", objectFit: "contain" }}
          />
        </div>

        <div style={codeStyle}>
          <div
            style={{
              flex: "1",
              display: "flex",
              flexDirection: "column",
              alignItems: "start",
              justifyContent: "start",
              padding: "2mm",
              color: "blue",
            }}
          >
            <QRCodeSVG value={addressQr} size={80} level="M" />
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                position: "relative",
                height: "45px",
                width: "80px",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  transform: "rotate(270deg)",
                  bottom: "2px",
                  fontWeight: "bold",
                  zIndex: "2",
                  fontSize: "3mm",
                }}
              >
                Quantity
              </div>

              <div
                style={{
                  transform: "rotate(270deg)",
                  transformOrigin: "center",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  position: "absolute",
                  left: "10px",
                  top: "0",
                }}
              >
                <Barcode
                  value={barcodeValue}
                  width={0.6}
                  height={43}
                  displayValue={false}
                  margin={0}
                />
              </div>
            </div>
          </div>
        </div>

        <div
          style={{
            marginTop: "5mm",
            textAlign: "center",
            width: "100%",
            paddingTop: "2mm",
          }}
        >
          <p
            style={{
              marginTop: "-5mm",
              fontSize: "3mm",
              fontWeight: "bold",
            }}
          >
            All Observed rights by ATPL
          </p>
        </div>
      </div>
    </div>
  );
};

// Add these functions since they're referenced in ShippingLabel
const generateOrderNumber = () => {
  return Math.floor(10000 + Math.random() * 90000).toString(); // Ensures exactly 5 digits
};

const generateTrackingNumber = () => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let trackingNumber = "";
  for (let i = 0; i < 8; i++) {
    trackingNumber += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return trackingNumber + Date.now().toString().slice(-4); // Unique 12-digit tracking number
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

const senderInfo = {
  name: "ARCHERY TECHNOCRATS PRIVATE LIMITED",
  address: "275/11, Ganshi Road, West Tambaram, Chennai, Tamil Nadu - 600045",
};

const receiverInfo = {
  name: "Honeywell Industrial Automation",
  address: "855 S, Mint StCharlotte , NC 28202, 800-582-4263",
};

const User = () => {
  const theme = useTheme();

  const [parts, setParts] = useState([]);
  const [selectedPartNo, setSelectedPartNo] = useState("");
  const [selectedPart, setSelectedPart] = useState({
    partName: "",
    quantity: "",
    packageCount: 0,
  });
  const [scanQuantity, setScanQuantity] = useState("");
  const [scannedQuantity, setScannedQuantity] = useState(0);
  const [status, setStatus] = useState("⚠️ processing");
  const [totalPartCount, setTotalPartCount] = useState(0);
  const [totalPackageCount, setTotalPackageCount] = useState(0);
  const [previousScanQuantity, setPreviousScanQuantity] = useState("");
  const [trackingRefresh, setTrackingRefresh] = useState(0);

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
    // Regenerate tracking numbers before printing
    setTrackingRefresh((prev) => prev + 1);

    // Small delay to ensure new tracking numbers are set before printing
    setTimeout(() => {
      // Create a new div to clone the print content
      const printContent = document.querySelector(".print-content");

      if (!printContent) {
        console.error("Print content not found");
        return;
      }

      // Create a new div for print
      const printContainer = document.createElement("div");
      printContainer.id = "print-container";
      printContainer.style.position = "fixed";
      printContainer.style.top = "0";
      printContainer.style.left = "0";
      printContainer.style.width = "100%";
      printContainer.style.height = "100%";
      printContainer.style.backgroundColor = "white";
      printContainer.style.zIndex = "9999";
      printContainer.style.display = "flex";
      printContainer.style.justifyContent = "center";
      printContainer.style.alignItems = "center";
      printContainer.style.overflow = "auto";

      // Clone the print content
      const clonedContent = printContent.cloneNode(true);
      clonedContent.style.width = "100mm";
      clonedContent.style.height = "150mm";
      clonedContent.style.margin = "0 auto";
      clonedContent.style.boxShadow = "0 0 10px rgba(0,0,0,0.1)";

      // Append cloned content to container
      printContainer.appendChild(clonedContent);

      // Add print styles
      const printStyles = document.createElement("style");
      printStyles.textContent = `
      @media print {
        body * {
          visibility: hidden;
        }
        #print-container, 
        #print-container * {
          visibility: visible;
        }
        #print-container {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
        }
      }
    `;

      // Append container and styles to body
      document.body.appendChild(printContainer);
      document.body.appendChild(printStyles);

      // Create print button
      const printButton = document.createElement("button");
      printButton.textContent = "Print Label";
      printButton.style.position = "fixed";
      printButton.style.bottom = "20px";
      printButton.style.left = "50%";
      printButton.style.transform = "translateX(-50%)";
      printButton.style.zIndex = "10000";
      printButton.style.padding = "10px 20px";
      printButton.style.backgroundColor = "#007bff";
      printButton.style.color = "white";
      printButton.style.border = "none";
      printButton.style.borderRadius = "5px";

      printButton.addEventListener("click", () => {
        window.print();

        // Remove print container after printing
        document.body.removeChild(printContainer);
        document.body.removeChild(printStyles);
      });

      // Add close button
      const closeButton = document.createElement("button");
      closeButton.textContent = "Close";
      closeButton.style.position = "fixed";
      closeButton.style.bottom = "20px";
      closeButton.style.right = "20px";
      closeButton.style.zIndex = "10000";
      closeButton.style.padding = "10px 20px";
      closeButton.style.backgroundColor = "#dc3545";
      closeButton.style.color = "white";
      closeButton.style.border = "none";
      closeButton.style.borderRadius = "5px";

      closeButton.addEventListener("click", () => {
        document.body.removeChild(printContainer);
        document.body.removeChild(printStyles);
      });

      // Append buttons to body
      document.body.appendChild(printButton);
      document.body.appendChild(closeButton);
    }, 100);
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
        packageCount: 0,
      });

      toast.custom(
        (t) => (
          <CustomAlert
            title="Scan Information"
            message={`Once the scan quantity reaches ${part.quantity}, the label will be automatically printed.`}
            type="info"
          />
        ),
        {
          duration: 4000,
          position: "top-right",
        }
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

          // Generate new tracking numbers and print
          setTrackingRefresh((prev) => prev + 1);
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
      if (response.data.success) {
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

      <Box>
        <Container maxWidth="lg">
          {/* Hidden shipping label for printing */}
          <Box sx={{ display: "none" }}>
            <ShippingLabel
              partNo={selectedPartNo}
              logoUrl={logoIcon}
              partName={selectedPart.partName}
              quantity={selectedPart.quantity}
              sender={senderInfo}
              receiver={receiverInfo}
              refreshTrackingNumbers={trackingRefresh}
            />
          </Box>

          <Grid container spacing={2}>
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

            <Grid item xs={12} sm={6} md={6}>
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
