const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();

app.use(express.json());

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

app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

app.options("*", cors());

// Health check endpoint - BEFORE all other routes
app.get("/", (req, res) => {
  res.json({
    status: "ok",
    message: "Lucas Backend API is running",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
    endpoints: {
      statistics: "/api/statistics",
      scan: "/api/scan",
      invoiceProgress: "/api/invoice-progress",
      binData: "/api/bindata",
      rawScans: "/api/raw-scans",
      admin: "/api/admin",
      parts: "/api/parts",
      production: "/api/production",
      operators: "/api/operators",
      users: "/api/users",
    },
  });
});

// All your existing routes
const adminRoute = require("./src/Route/AdminRoute");
app.use(adminRoute);

const partRoutes = require("./src/Route/PartRoute");
app.use(partRoutes);

const productionRoutes = require("./src/Route/ProductionRoute");
app.use(productionRoutes);

const invoiceRoutes = require("./src/Route/InvoiceRoute");
app.use(invoiceRoutes);

const operatorLogin = require("./src/Route/OperatorRoute");
app.use(operatorLogin);

const statisticsRoutes = require("./src/Route/StatisticsRoute");
app.use("/api/statistics", statisticsRoutes);

const barcodeRoutes = require("./src/Route/InvoiceRoute");
app.use("/api/scan", barcodeRoutes);

const binDetails = require("./src/Route/BinRoute");
app.use("/api", binDetails);

const invoiceProgress = require("./src/Route/invoiceProgressRoute");
app.use("/api/invoice-progress", invoiceProgress);

const rawScansRoutes = require("./src/Route/MachineRoute");
app.use("/api/raw-scans", rawScansRoutes);

const userRoutes = require("./src/Route/UserRoute");
app.use(userRoutes);

// 404 handler for unknown routes - MUST BE LAST
app.use("*", (req, res) => {
  console.log("404 - Route not found:", req.originalUrl);
  res.status(404).json({
    success: false,
    message: "API route not found",
    requestedRoute: req.originalUrl,
    method: req.method,
    availableRoutes: [
      "GET /",
      "GET /api/statistics",
      "POST /api/statistics",
      "GET /api/scan/data",
      "GET /api/scan/data/search",
      "POST /api/scan",
      "GET /api/invoice-progress/:invoiceNumber",
      "POST /api/invoice-progress",
      "GET /api/bindata",
      "POST /api/bindata/qr",
      "GET /api/raw-scans",
      "POST /api/raw-scans",
    ],
  });
});

module.exports = app;
