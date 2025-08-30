const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();

app.use(express.json());

// CORS setup
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);
app.options("*", cors());

// ----------------------
// API ROUTES
// ----------------------
const adminRoute = require("./src/Route/AdminRoute");
app.use(adminRoute);

const partRoutes = require("./src/Route/PartRoute");
app.use(partRoutes);

const productionRoutes = require("./src/Route/ProductionRoute");
app.use(productionRoutes);

const invoiceRoutes = require("./src/Route/InvoiceRoute");
app.use(invoiceRoutes);

const barcodeRoutes = require("./src/Route/InvoiceRoute");
app.use("/api/scan", barcodeRoutes);

const binDetails = require("./src/Route/BinRoute");
app.use("/api", binDetails);

const rawScansRoutes = require("./src/Route/MachineRoute");
app.use("/api/raw-scans", rawScansRoutes);

const userRoutes = require("./src/Route/UserRoute");
app.use(userRoutes);

// ----------------------
// SERVE REACT FRONTEND (PRODUCTION)
// ----------------------
// after you run "npm run build" in frontend, copy the build/dist into backend folder
app.use(express.static(path.join(__dirname, "client", "dist"))); // for Vite
// OR
// app.use(express.static(path.join(__dirname, "client", "build"))); // for CRA

// Catch-all: return React index.html for any unknown route
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "client", "dist", "index.html")); // adjust build/dist accordingly
});

// ----------------------
module.exports = app;
