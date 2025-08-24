import React, { useState } from "react";
import {
  Box,
  TextField,
  Button,
  Typography,
  Card,
  CardContent,
} from "@mui/material";
import { Toaster, toast } from "react-hot-toast";
import { api } from "../apiConfig";

const PartMaster = () => {
  const [formData, setFormData] = useState({
    partNo: "",
    description: "",
    binQuantity: "",
  });

  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (!formData.partNo || !formData.description || !formData.binQuantity) {
        toast.error("All fields are required.");
        return;
      }

      const apiData = {
        partNo: formData.partNo,
        partName: formData.description,
        quantity: formData.binQuantity,
        labelSize: "4 inch",
      };

      const response = await api.post("/addPart", apiData);
      toast.success(response.data.message);
      setFormData({ partNo: "", description: "", binQuantity: "" });
    } catch (error) {
      const errorMessage =
        error.response?.data?.message || "An unexpected error occurred.";
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box
      sx={{
       
        backgroundColor: "#f5f5f5",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        p: 2,
      }}
    >
      <Toaster position="top-right" />

      <Card
        sx={{
          width: "100%",
          maxWidth: 450,
          boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
          borderRadius: 2,
        }}
      >
        <CardContent sx={{ p: 4 }}>
          <Typography
            variant="h5"
            sx={{
              textAlign: "center",
              mb: 3,
              fontWeight: 600,
              color: "#333",
            }}
          >
            Part Master
          </Typography>

          <form onSubmit={handleSubmit}>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
              <TextField
                fullWidth
                label="Part Number"
                name="partNo"
                value={formData.partNo}
                onChange={handleChange}
                required
                size="medium"
              />

              <TextField
                fullWidth
                label="Description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                required
                multiline
                rows={2}
                size="medium"
              />

              <TextField
                fullWidth
                label="Bin Quantity"
                name="binQuantity"
                type="number"
                value={formData.binQuantity}
                onChange={handleChange}
                required
                inputProps={{ min: 0 }}
                size="medium"
              />

              <Button
                type="submit"
                variant="contained"
                fullWidth
                disabled={isLoading}
                sx={{
                  mt: 1,
                  py: 1.5,
                  backgroundColor: "#1976d2",
                  "&:hover": {
                    backgroundColor: "#1565c0",
                  },
                  textTransform: "none",
                  fontSize: "1rem",
                }}
              >
                {isLoading ? "Saving..." : "Save Part"}
              </Button>
            </Box>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
};

export default PartMaster;
