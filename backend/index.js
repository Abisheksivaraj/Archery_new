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

// ============================================
// SERVE REACT BUILD FOR PRODUCTION
// ============================================

// Try multiple possible build paths
const possibleBuildPaths = [
  path.join(__dirname, "../frontend/dist"), // Vite
  path.join(__dirname, "../frontend/build"), // Create React App
  path.join(__dirname, "dist"), // If built in backend
  path.join(__dirname, "build"), // If built in backend
];

let buildPath = null;
const fs = require("fs");

// Find which build path exists
for (const testPath of possibleBuildPaths) {
  if (fs.existsSync(testPath)) {
    buildPath = testPath;
    console.log(`✅ Found React build at: ${buildPath}`);
    break;
  }
}

if (buildPath && process.env.NODE_ENV === "production") {
  // Serve static files from the React build
  app.use(express.static(buildPath));

  // Handle React routing - return index.html for all non-API routes
  app.get("*", (req, res) => {
    const indexPath = path.join(buildPath, "index.html");
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res.status(404).json({
        success: false,
        message: "index.html not found in build directory",
        buildPath: buildPath,
      });
    }
  });
} else {
  // Development mode or no build found
  app.use("*", (req, res) => {
    console.log("404 - Route not found:", req.originalUrl);

    if (!buildPath) {
      res.status(404).json({
        success: false,
        message: "React build not found. Please build your frontend first.",
        instruction: "Run 'npm run build' in your frontend directory",
        searchedPaths: possibleBuildPaths,
        currentEnv: process.env.NODE_ENV || "not set",
      });
    } else {
      res.status(404).json({
        success: false,
        message: "Route not found - Set NODE_ENV=production to serve frontend",
        requestedRoute: req.originalUrl,
        currentEnv: process.env.NODE_ENV || "not set",
      });
    }
  });
}

module.exports = app;
