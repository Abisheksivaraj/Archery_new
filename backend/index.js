const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();

app.use(express.json());

// Add static file serving with proper MIME types
app.use(
  "/src",
  express.static(path.join(__dirname, "src"), {
    setHeaders: (res, path) => {
      if (path.endsWith(".css")) {
        res.setHeader("Content-Type", "text/css");
      }
      if (path.endsWith(".js")) {
        res.setHeader("Content-Type", "text/javascript");
      }
    },
  })
);

// Alternative: serve all static files from root with proper MIME types
app.use(
  express.static(__dirname, {
    setHeaders: (res, path) => {
      if (path.endsWith(".css")) {
        res.setHeader("Content-Type", "text/css");
      }
      if (path.endsWith(".js")) {
        res.setHeader("Content-Type", "text/javascript");
      }
    },
  })
);

app.use(
  cors({
    origin: "https://archery-new-2.onrender.com/", // Allow requests from this origin
    // origin: "http://localhost:5173",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"], // Allowed methods
    allowedHeaders: ["Content-Type", "Authorization"], // Allowed headers
    credentials: true, // Allow credentials (if required)
  })
);

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

const productionRoutes = require("./src/Route/ProductionRoute");
app.use(productionRoutes);

const invoiceRoutes = require("./src/Route/InvoiceRoute");
app.use(invoiceRoutes);

// ADD THIS LINE - Barcode scan routes
const barcodeRoutes = require("./src/Route/InvoiceRoute");
app.use("/api/scan", barcodeRoutes);

const binDetails = require("./src/Route/BinRoute");
app.use("/api", binDetails);

const rawScansRoutes = require("./src/Route/MachineRoute");
app.use("/api/raw-scans", rawScansRoutes);

const userRoutes = require("./src/Route/UserRoute");
app.use(userRoutes);

// 404 handler for debugging
app.use("*", (req, res) => {
  console.log("404 - Route not found:", req.originalUrl);
  res.status(404).json({
    success: false,
    message: "Route not found",
    requestedRoute: req.originalUrl,
  });
});

module.exports = app;
