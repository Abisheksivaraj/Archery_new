import React, { useState } from "react";
import {
  Box,
  TextField,
  Button,
  Typography,
  Grid,
  Card,
  CardContent,
  CardMedia,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
} from "@mui/material";
import QRCode from "qrcode";
import logo from "../assets/companyLogo.png";
import { Toaster, toast } from "react-hot-toast";
import { api } from "../apiConfig";

const PartMaster = () => {
  const [formData, setFormData] = useState({
    partNo: "",
    partName: "",
    quantity: "",
    labelSize: "",
  });

  const [currentPart, setCurrentPart] = useState(null);
  const [qrCodeUrl, setQrCodeUrl] = useState("");

  const primaryColor = "#39a3dd";
  const secondaryColor = "#e85874";

  const generateQRCode = async (part) => {
    try {
      const qrData = `Part No: ${part.partNo}, Part Name: ${part.partName}, Quantity: ${part.quantity}, Label Size: ${part.labelSize}`;
      const url = await QRCode.toDataURL(qrData);
      return url;
    } catch (err) {
      console.error("Error generating QR code:", err);
      return null;
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (
        !formData.partNo ||
        !formData.partName ||
        !formData.quantity ||
        !formData.labelSize
      ) {
        toast.error("All fields are required.");
        return;
      }

      const response = await api.post("/addPart", formData);
      toast.success(response.data.message);

      const qrCode = await generateQRCode(formData);
      setCurrentPart({ ...formData, qrCode });

      setFormData({ partNo: "", partName: "", quantity: "", labelSize: "" });
    } catch (error) {
      const errorMessage =
        error.response?.data?.message || "An unexpected error occurred.";
      toast.error(errorMessage);
    }
  };

  return (
    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
      <Toaster position="top-right" reverseOrder={false} />
      <Card
        elevation={4}
        sx={{
          width: { xs: "40vh", sm: "50vh", md: "80vh" },
          p: 4,
          mx: "auto",
          borderRadius: 3,
          backgroundColor: "#f8f9fa",
          boxShadow: "0px 4px 10px rgba(0, 0, 0, 0.2)",
        }}
      >
        <Typography
          variant="h4"
          gutterBottom
          sx={{
            color: "#1e293b",
            fontWeight: "bold",
            textAlign: "center",
            mb: 3,
            letterSpacing: 1,
          }}
        >
          🛠 Part Master
        </Typography>
        <form onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Part Number"
                name="partNo"
                value={formData.partNo}
                onChange={handleChange}
                required
                variant="outlined"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Part Name"
                name="partName"
                value={formData.partName}
                onChange={handleChange}
                required
                variant="outlined"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Quantity"
                name="quantity"
                type="number"
                value={formData.quantity}
                onChange={handleChange}
                required
                variant="outlined"
              />
            </Grid>
            <Grid item xs={12} sx={{ mt: -1 }}>
              <FormControl>
                <FormLabel id="label-size-group-label">Label Size</FormLabel>
                <RadioGroup
                  row // This makes the radio buttons appear in a row
                  aria-labelledby="label-size-group-label"
                  name="labelSize"
                  value={formData.labelSize}
                  onChange={handleChange} // Ensures state updates correctly
                >
                  <FormControlLabel
                    value="4 inch"
                    control={<Radio />}
                    label="4 inch"
                  />
                  <FormControlLabel
                    value="6 inch"
                    control={<Radio />}
                    label="6 inch"
                  />
                </RadioGroup>
              </FormControl>
            </Grid>

            <Grid item xs={12} sx={{ mt: -3 }}>
              <Button
                type="submit"
                variant="contained"
                fullWidth
                sx={{
                  backgroundColor: primaryColor,
                  color: "#fff",
                  borderRadius: 2,
                  py: 1.5,
                  fontSize: "1rem",
                  fontWeight: "bold",
                  boxShadow: "0px 4px 8px rgba(13, 110, 253, 0.4)",
                  textTransform: "none",
                  transition: "all 0.3s ease",
                  "&:hover": {
                    backgroundColor: "#92DFF3",
                    color: "#000",
                    transform: "translateY(-2px)",
                    boxShadow: "0px 6px 12px rgba(0, 86, 179, 0.4)",
                  },
                }}
              >
                💾 Save Part
              </Button>
            </Grid>
          </Grid>
        </form>
      </Card>

      <Box sx={{ flexGrow: 1, height: "100%" }}>
        <Typography
          variant="h5"
          gutterBottom
          sx={{ color: secondaryColor, fontWeight: "bold" }}
        >
          Current Part
        </Typography>
        <Box
          sx={{
            display: "grid",
            gap: 2,
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          }}
        >
          {!currentPart ? (
            <Typography
              color="textSecondary"
              align="center"
              sx={{ color: primaryColor }}
            >
              No part saved yet
            </Typography>
          ) : (
            <Card
              elevation={3}
              sx={{
                p: 2,
                borderRadius: 2,
                boxShadow: "0 4px 10px rgba(0,0,0,0.1)",
                transition: "transform 0.2s ease-in-out",
                "&:hover": { transform: "scale(1.05)" },
              }}
            >
              <CardContent
                sx={{
                  width: "50mm",
                  height: "25mm",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  borderRadius: 2,
                  border: "1px solid black",
                  padding: 1,
                }}
              >
                <CardMedia
                  component="img"
                  image={logo}
                  alt="Company Logo"
                  sx={{ width: "20mm", height: "15mm", objectFit: "contain" }}
                />
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    mb: 1,
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "start",
                    }}
                  >
                    <Typography
                      variant="subtitle2"
                      sx={{
                        fontWeight: "medium",
                        color: "#000",
                        fontSize: "8pt",
                      }}
                    >
                      Part No: {currentPart.partNo}
                    </Typography>
                    <Typography sx={{ fontSize: "8pt", fontWeight: "bold" }}>
                      Part Name: {currentPart.partName}
                    </Typography>
                    <Typography sx={{ fontSize: "8pt", fontWeight: "bold" }}>
                      Quantity: {currentPart.quantity}
                    </Typography>
                  </Box>
                  <img
                    src={currentPart.qrCode}
                    alt="QR Code"
                    style={{ width: "15mm", height: "15mm" }}
                  />
                </Box>
              </CardContent>
            </Card>
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default PartMaster;
