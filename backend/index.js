const express = require("express");
const cors = require("cors");

const app = express();

app.use(express.json());

// Configure CORS with specific origin and methods
app.use(
  cors({
    origin: "http://localhost:5173", // Allow requests from this origin
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"], // Allowed methods
    allowedHeaders: ["Content-Type", "Authorization"], // Allowed headers
    credentials: true, // Allow credentials (if required)
  })
);

// Explicitly handle preflight (OPTIONS) requests
app.options("*", cors());

// Welcome route
app.get("/", (req, res) => {
  return res.status(200).send({ message: "Welcome" });
});

// Import and use routes
const adminRoute = require("./src/Route/AdminRoute");
app.use(adminRoute);

const partRoutes = require("./src/Route/PartRoute");
app.use(partRoutes);

// Count management
let counts = {
  totalPartCount: 0,
  totalPackageCount: 0,
};

app.get("/getCounts", (req, res) => {
  res.status(200).json(counts);
});

app.get("/getTotalPartCount", (req, res) => {
  res.status(200).json({ totalPartCount: counts.totalPartCount });
});

app.get("/getTotalPackageCount", (req, res) => {
  res.status(200).json({ totalPackageCount: counts.totalPackageCount });
});

app.post("/saveCounts", (req, res) => {
  const { totalPartCount, totalPackageCount } = req.body;

  if (
    typeof totalPartCount === "number" &&
    typeof totalPackageCount === "number"
  ) {
    counts.totalPartCount = totalPartCount;
    counts.totalPackageCount = totalPackageCount;
    res.status(200).json({ message: "Counts saved successfully", counts });
  } else {
    res.status(400).json({ message: "Invalid data provided" });
  }
});

// Reset total parts count
app.post("/deleteTotalParts", (req, res) => {
  try {
    counts.totalPartCount = 0;
    res.status(200).json({
      message: "Total parts count reset successfully",
      totalPartCount: counts.totalPartCount,
    });
  } catch (error) {
    res.status(500).json({ message: "Error resetting total parts count" });
  }
});

// Reset total packages count
app.post("/deleteTotalPackages", (req, res) => {
  try {
    counts.totalPackageCount = 0;
    res.status(200).json({
      message: "Total packages count reset successfully",
      totalPackageCount: counts.totalPackageCount,
    });
  } catch (error) {
    res.status(500).json({ message: "Error resetting total packages count" });
  }
});

// Reset all counts
app.post("/deleteAllCounts", (req, res) => {
  try {
    counts.totalPartCount = 0;
    counts.totalPackageCount = 0;
    res.status(200).json({
      message: "All counts reset successfully",
      counts,
    });
  } catch (error) {
    res.status(500).json({ message: "Error resetting counts" });
  }
});

module.exports = app;
