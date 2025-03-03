const express = require("express");
const cors = require("cors");

const app = express();

app.use(express.json());
const { ThermalPrinter, PrinterTypes } = require("node-thermal-printer");
const net = require("net");


app.use(
  cors({
    origin: "*", // Allow requests from this origin

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



// Store active printer connections
const printerConnections = {};

// Check if a printer is reachable at the given IP address
const isPrinterReachable = (ipAddress) => {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    const timeout = 3000; // 3 seconds timeout
    
    socket.setTimeout(timeout);
    
    // Handle connection success
    socket.on('connect', () => {
      socket.end();
      resolve(true);
    });
    
    // Handle errors (connection refused, timeout, etc.)
    socket.on('error', () => {
      socket.destroy();
      resolve(false);
    });
    
    // Handle timeout
    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    
    // Try to connect to printer - usually port 9100 for network printers
    socket.connect(9100, ipAddress);
  });
};

// Connect to printer endpoint
app.post('/api/printer/connect', async (req, res) => {
  try {
    const { ipAddress } = req.body;
    
    if (!ipAddress) {
      return res.status(400).json({ success: false, message: 'IP address is required' });
    }
    
    // Check if printer is reachable
    const isReachable = await isPrinterReachable(ipAddress);
    
    if (!isReachable) {
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot connect to printer. Please check the IP address and ensure the printer is online.' 
      });
    }
    
    // Create a new printer instance using PX940 type
    const printer = new ThermalPrinter({
      type: PrinterTypes.PX940, // Using PX940 printer type
      interface: `tcp://${ipAddress}:9100`, // Standard port for network printers
      options: {
        timeout: 5000
      }
    });
    
    // Store the printer connection
    printerConnections[ipAddress] = printer;
    
    res.json({ 
      success: true, 
      message: 'Successfully connected to printer',
      printerInfo: {
        ipAddress,
        status: 'connected'
      }
    });
  } catch (error) {
    console.error('Error connecting to printer:', error);
    res.status(500).json({ success: false, message: 'Server error when connecting to printer' });
  }
});

// Disconnect from printer endpoint
app.post('/api/printer/disconnect', (req, res) => {
  try {
    const { ipAddress } = req.body;
    
    if (!ipAddress) {
      return res.status(400).json({ success: false, message: 'IP address is required' });
    }
    
    // Remove the printer connection
    if (printerConnections[ipAddress]) {
      delete printerConnections[ipAddress];
    }
    
    res.json({ success: true, message: 'Disconnected from printer' });
  } catch (error) {
    console.error('Error disconnecting from printer:', error);
    res.status(500).json({ success: false, message: 'Server error when disconnecting from printer' });
  }
});

// Print document endpoint
app.post('/api/printer/print', async (req, res) => {
  try {
    const { ipAddress, content } = req.body;
    
    if (!ipAddress) {
      return res.status(400).json({ 
        success: false, 
        message: 'IP address is required' 
      });
    }
    
    // Check if we have a connection to this printer
    const printer = printerConnections[ipAddress];
    if (!printer) {
      return res.status(400).json({ 
        success: false, 
        message: 'Not connected to printer. Please connect first.' 
      });
    }
    
    // Verify printer is still reachable
    const isConnected = await isPrinterReachable(ipAddress);
    if (!isConnected) {
      delete printerConnections[ipAddress];
      return res.status(400).json({ 
        success: false, 
        message: 'Printer connection lost. Please reconnect.' 
      });
    }
    
    // For PX940 printers, you might need to use different commands
    // The following is a simplified example and should be adjusted to your specific printer's ZPL or other command language
    
    const printerCommands = content || `
^XA
^FO50,50^A0N,50,50^FDTest Print^FS
^FO50,120^A0N,30,30^FDPrinter: ${ipAddress}^FS
^FO50,170^A0N,30,30^FDDate: ${new Date().toLocaleString()}^FS
^XZ
`;
    
    // Send raw commands to the printer
    await printer.raw(printerCommands);
    
    res.json({ 
      success: true, 
      message: 'Document printed successfully' 
    });
  } catch (error) {
    console.error('Error printing document:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error when printing document' 
    });
  }
});

// Get printer status endpoint
app.get('/api/printer/status/:ipAddress', async (req, res) => {
  try {
    const { ipAddress } = req.params;
    
    // Check if the printer is reachable
    const isReachable = await isPrinterReachable(ipAddress);
    
    if (!isReachable) {
      // If we have a stored connection, remove it
      if (printerConnections[ipAddress]) {
        delete printerConnections[ipAddress];
      }
      
      return res.json({ 
        success: true, 
        status: 'disconnected' 
      });
    }
    
    res.json({ 
      success: true, 
      status: 'connected' 
    });
  } catch (error) {
    console.error('Error checking printer status:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error when checking printer status' 
    });
  }
});


module.exports = app;
