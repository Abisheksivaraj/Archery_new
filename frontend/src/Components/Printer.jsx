import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  CircularProgress,
  Alert,
  Chip,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import PrintIcon from "@mui/icons-material/Print";
import WifiIcon from "@mui/icons-material/Wifi";
import WifiOffIcon from "@mui/icons-material/WifiOff";
import { api } from "../apiConfig";

// Configure the base URL for API calls


// Styled components
const StatusChip = styled(Chip)(({ theme, status }) => ({
  marginBottom: theme.spacing(2),
  backgroundColor:
    status === "connected"
      ? theme.palette.success.main
      : theme.palette.error.main,
  color: theme.palette.common.white,
}));

const PrinterConnection = () => {
  const [ipAddress, setIpAddress] = useState("");
  const [printerStatus, setPrinterStatus] = useState("disconnected");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Validate IP address format
  const isValidIpAddress = (ip) => {
    const ipRegex =
      /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){2}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    return ipRegex.test(ip);
  };

  // Connect to printer
  const connectToPrinter = async () => {
    if (!isValidIpAddress(ipAddress)) {
      setErrorMessage("Please enter a valid IP address.");
      return;
    }

    setIsLoading(true);
    setErrorMessage("");

    try {
      const response = await api.post(`/api/printer/connect`, {
        ipAddress,
      });

      if (response.data.success) {
        setPrinterStatus("connected");
      } else {
        setErrorMessage(
          response.data.message || "Failed to connect to printer"
        );
      }
    } catch (error) {
      console.error("Error connecting to printer:", error);
      setPrinterStatus("disconnected");
      setErrorMessage(
        error.response?.data?.message ||
          "Failed to connect to printer. Please check the IP address and ensure the printer is online."
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Send print job to printer
  const printDocument = async () => {
    if (printerStatus !== "connected") {
      setErrorMessage("Please connect to a printer first.");
      return;
    }

    setIsLoading(true);
    setErrorMessage("");

    try {
      const response = await api.post(`/api/printer/print`, {
        ipAddress,
        content: "Direct print command", // Default content
      });

      if (response.data.success) {
        setErrorMessage("");
      } else {
        setErrorMessage(response.data.message || "Failed to print document");
      }
    } catch (error) {
      console.error("Error printing document:", error);
      setErrorMessage(
        error.response?.data?.message ||
          "Failed to print document. Please try again."
      );

      // If printer connection is lost
      if (error.response?.data?.message?.includes("connection lost")) {
        setPrinterStatus("disconnected");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Disconnect from printer
  const disconnectPrinter = async () => {
    try {
      await api.post(`/api/printer/disconnect`, {
        ipAddress,
      });
      setPrinterStatus("disconnected");
    } catch (error) {
      console.error("Error disconnecting from printer:", error);
    }
  };

  // Check printer status periodically
  useEffect(() => {
    let statusInterval;

    if (printerStatus === "connected") {
      statusInterval = setInterval(async () => {
        try {
          const response = await api.get(`/api/printer/status/${ipAddress}`);

          if (
            !response.data.success ||
            response.data.status === "disconnected"
          ) {
            setPrinterStatus("disconnected");
            clearInterval(statusInterval);
          }
        } catch (error) {
          console.error("Error checking printer status:", error);
          setPrinterStatus("disconnected");
          clearInterval(statusInterval);
        }
      }, 10000); // Check every 10 seconds
    }

    return () => {
      if (statusInterval) clearInterval(statusInterval);
    };
  }, [printerStatus, ipAddress]);

  return (
    <Paper elevation={3} sx={{ maxWidth: 400, mx: "auto", p: 3 }}>
      <Typography variant="h5" component="h2" gutterBottom>
        Ethernet Printer Connection
      </Typography>

      <Box sx={{ mb: 3 }}>
        <Box sx={{ mb: 2 }}>
          <TextField
            fullWidth
            label="Printer IP Address"
            variant="outlined"
            placeholder="192.168.1.100"
            value={ipAddress}
            onChange={(e) => setIpAddress(e.target.value)}
            disabled={isLoading || printerStatus === "connected"}
            sx={{ mb: 2 }}
          />

          {printerStatus === "disconnected" ? (
            <Button
              fullWidth
              variant="contained"
              color="primary"
              startIcon={
                isLoading ? (
                  <CircularProgress size={20} color="inherit" />
                ) : (
                  <WifiIcon />
                )
              }
              onClick={connectToPrinter}
              disabled={isLoading}
            >
              {isLoading ? "Connecting..." : "Connect to Printer"}
            </Button>
          ) : (
            <Button
              fullWidth
              variant="contained"
              color="error"
              startIcon={<WifiOffIcon />}
              onClick={disconnectPrinter}
            >
              Disconnect
            </Button>
          )}
        </Box>

        {printerStatus === "connected" && (
          <Box sx={{ mt: 3 }}>
            <StatusChip
              status={printerStatus}
              icon={<WifiIcon />}
              label={`Connected to ${ipAddress}`}
            />

            <Button
              fullWidth
              variant="contained"
              color="success"
              startIcon={
                isLoading ? (
                  <CircularProgress size={20} color="inherit" />
                ) : (
                  <PrintIcon />
                )
              }
              onClick={printDocument}
              disabled={isLoading}
            >
              {isLoading ? "Printing..." : "Print Document"}
            </Button>
          </Box>
        )}
      </Box>

      {errorMessage && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {errorMessage}
        </Alert>
      )}
    </Paper>
  );
};

export default PrinterConnection;
