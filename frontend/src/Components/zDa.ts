// import React, { useEffect, useState, useRef } from "react";
// import { toast } from "react-toastify";
// import logoIcon from "../assets/companyLogo.png";
// import { QRCodeSVG } from "qrcode.react";
// import { api } from "../apiConfig";
// import {
//   Box,
//   Container,
//   FormControl,
//   Grid,
//   IconButton,
//   InputLabel,
//   MenuItem,
//   Paper,
//   Select,
//   TextField,
//   Typography,
//   LinearProgress,
// } from "@mui/material";
// import SettingsIcon from "@mui/icons-material/Settings";
// import QrCodeScannerIcon from "@mui/icons-material/QrCodeScanner";
// import InventoryIcon from "@mui/icons-material/Inventory";
// import LocalShippingIcon from "@mui/icons-material/LocalShipping";

// const PartLabel = ({ partNo, logoUrl, partName, quantity }) => {
//   const qrCodeValue = JSON.stringify({
//     partNo,
//     partName,
//     quantity,
//   });

//   const labelStyle = {
//     width: "100mm",
//     height: "50mm",
//     padding: "6mm",
//     backgroundColor: "white",
//     border: "1px solid #ccc",
//     boxSizing: "border-box",
//     margin: "0 auto",
//     position: "relative",
//     display: "flex",
//     flexDirection: "column",
//   };

//   const contentContainerStyle = {
//     width: "100%",
//     display: "flex",
//     justifyContent: "space-between",
//     alignItems: "center",
//     marginTop: "2mm",
//     height: "calc(100% - 12mm)",
//   };

//   const textContainerStyle = {
//     width: "70%",
//     display: "flex",
//     flexDirection: "column",
//     justifyContent: "space-around",
//     overflow: "hidden",
//   };

//   const textStyle = {
//     margin: 0,
//     fontSize: "3.5mm",
//     color: "black",
//     fontWeight: "500",
//     whiteSpace: "nowrap",
//     overflow: "hidden",
//     textOverflow: "ellipsis",
//   };

//   const qrCodeContainerStyle = {
//     width: "25%",
//     display: "flex",
//     justifyContent: "center",
//     alignItems: "center",
//   };

//   return (
//     <div style={labelStyle} className="print-content">
//       <img
//         src={logoUrl}
//         alt="Company Logo"
//         style={{
//           width: "25mm",
//           height: "10mm",
//           objectFit: "contain",
//           alignSelf: "center",
//         }}
//       />
//       <div style={contentContainerStyle}>
//         <div style={textContainerStyle}>
//           <p style={textStyle}>
//             PartName: <strong>{partName}</strong>
//           </p>
//           <p style={textStyle}>
//             PartNo: <strong>{partNo}</strong>
//           </p>
//           <p style={textStyle}>
//             Packing Quantity: <strong>{quantity}</strong>
//           </p>
//         </div>
//         <div style={qrCodeContainerStyle}>
//           <QRCodeSVG
//             value={qrCodeValue}
//             size={100}
//             level="M"
//             style={{ margin: 0 }}
//           />
//         </div>
//       </div>
//     </div>
//   );
// };

// const User = () => {
//   const [parts, setParts] = useState([]);
//   const [selectedPartNo, setSelectedPartNo] = useState("");
//   const [selectedPart, setSelectedPart] = useState({
//     partName: "",
//     quantity: "",
//     packageCount: 0,
//   });
//   const [scanQuantity, setScanQuantity] = useState("");
//   const [scannedQuantity, setScannedQuantity] = useState(0);
//   const [status, setStatus] = useState("⚠️ Processing");
//   const [totalPartCount, setTotalPartCount] = useState(0);
//   const [totalPackageCount, setTotalPackageCount] = useState(0);
//   const [previousScanQuantity, setPreviousScanQuantity] = useState("");
//   const [cumulativeScannedQuantity, setCumulativeScannedQuantity] = useState(
//     {}
//   );
//   const [isLoading, setIsLoading] = useState(false);

//   const [buffer, setBuffer] = useState("");
//   const bufferTimeoutRef = useRef(null);
//   const scanQuantityRef = useRef(null);

//   useEffect(() => {
//     const handleKeyPress = (e) => {
//       if (!selectedPartNo) return;

//       if (/^\d$/.test(e.key)) {
//         setBuffer((prev) => prev + e.key);

//         if (bufferTimeoutRef.current) {
//           clearTimeout(bufferTimeoutRef.current);
//         }

//         bufferTimeoutRef.current = setTimeout(() => {
//           if (buffer.length > 0) {
//             setScanQuantity(buffer);
//             checkStatus(selectedPartNo, buffer);
//             setBuffer("");
//           }
//         }, 50);
//       }
//     };

//     window.addEventListener("keypress", handleKeyPress);

//     return () => {
//       window.removeEventListener("keypress", handleKeyPress);
//       if (bufferTimeoutRef.current) {
//         clearTimeout(bufferTimeoutRef.current);
//       }
//     };
//   }, [selectedPartNo, buffer]);

//   useEffect(() => {
//     if (selectedPartNo && scanQuantityRef.current) {
//       scanQuantityRef.current.focus();
//     }
//   }, [selectedPartNo]);

//   useEffect(() => {
//     const fetchInitialData = async () => {
//       try {
//         setIsLoading(true);
//         const [partsResponse, countsResponse] = await Promise.all([
//           api.get("/getAllParts"),
//           api.get("/getCounts"),
//         ]);

//         setParts(partsResponse.data.parts);
//         if (countsResponse.data) {
//           setTotalPartCount(countsResponse.data.totalPartCount || 0);
//           setTotalPackageCount(countsResponse.data.totalPackageCount || 0);
//         }
//       } catch (error) {
//         console.error("Error fetching initial data:", error);
//         toast.error("Failed to fetch initial data");
//       } finally {
//         setIsLoading(false);
//       }
//     };

//     fetchInitialData();
//   }, []);

//   const fetchPartHistory = async (partNo) => {
//     try {
//       const response = await api.get(`/getProductionData/${partNo}`);
//       return response.data?.scannedQuantity || 0;
//     } catch (error) {
//       console.error("Error fetching part history:", error);
//       return 0;
//     }
//   };

//   const saveProductionData = async () => {
//     try {
//       setIsLoading(true);
//       const currentTotal = cumulativeScannedQuantity[selectedPartNo] || 0;
//       const newTotal = currentTotal + Number(selectedPart.quantity);

//       const productionData = {
//         partNo: selectedPartNo,
//         partName: selectedPart.partName,
//         productionQuantity: selectedPart.quantity,
//         scannedQuantity: newTotal,
//         totalParts: totalPartCount + 1,
//         packageCount: selectedPart.packageCount + 1,
//         timestamp: new Date().toISOString(),
//       };

//       await api.post("/saveProductionData", productionData);

//       setCumulativeScannedQuantity((prev) => ({
//         ...prev,
//         [selectedPartNo]: newTotal,
//       }));

//       setSelectedPart((prev) => ({
//         ...prev,
//         packageCount: prev.packageCount + 1,
//       }));

//       setTotalPackageCount((prev) => prev + 1);
//       setScannedQuantity(0);

//       handlePrint();
//       toast.success("Package completed and saved successfully");
//     } catch (error) {
//       console.error("Error saving production data:", error);
//       toast.error("Failed to save production data");
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   const handlePartNoChange = async (e) => {
//     const value = e.target.value;
//     try {
//       setIsLoading(true);
//       setSelectedPartNo(value);
//       setScannedQuantity(0);
//       setScanQuantity("");
//       setStatus("⚠️ Processing");
//       setPreviousScanQuantity("");

//       if (value) {
//         const part = parts.find((p) => p.partNo === value);
//         if (part) {
//           const [packageCount, previousTotal] = await Promise.all([
//             api
//               .get(`/getPartPackageCount/${value}`)
//               .then((res) => res.data.packageCount),
//             fetchPartHistory(value),
//           ]);

//           setCumulativeScannedQuantity((prev) => ({
//             ...prev,
//             [value]: previousTotal,
//           }));

//           setSelectedPart({
//             partName: part.partName,
//             quantity: part.quantity,
//             packageCount: packageCount || 0,
//           });
//         }
//       } else {
//         setSelectedPart({
//           partName: "",
//           quantity: "",
//           packageCount: 0,
//         });
//       }
//     } catch (error) {
//       console.error("Error changing part:", error);
//       toast.error("Failed to load part details");
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   const handleScanQuantityChange = (e) => {
//     const value = e.target.value;
//     setScanQuantity(value);
//     checkStatus(selectedPartNo, value);
//   };

//   const checkStatus = (partNoValue, scanQuantityValue) => {
//     if (String(partNoValue).trim() === String(scanQuantityValue).trim()) {
//       setStatus("PASS ✅");
//       if (scanQuantityValue !== previousScanQuantity) {
//         const newScannedQuantity = scannedQuantity + 1;
//         setTotalPartCount((prev) => prev + 1);
//         setScanQuantity("");

//         if (newScannedQuantity === Number(selectedPart.quantity)) {
//           saveProductionData();
//         } else {
//           setScannedQuantity(newScannedQuantity);
//         }

//         setPreviousScanQuantity(scanQuantityValue);
//       }
//     } else {
//       setStatus("Fail 🚫");
//       setPreviousScanQuantity("");
//       setTimeout(() => {
//         setScanQuantity("");
//         if (scanQuantityRef.current) {
//           scanQuantityRef.current.focus();
//         }
//       }, 500);
//     }
//   };

//   const handlePrint = () => {
//     const printWindow = window.open("", "_blank");
//     printWindow.document.write(`
//       <html>
//         <head>
//           <title>Print Label</title>
//           <style>
//             @page {
//               size: 100mm 50mm;
//               margin: 0;
//             }
//             body {
//               margin: 0;
//               padding: 0;
//             }
//             #print-content {
//               width: 100%;
//               height: 100%;
//             }
//           </style>
//         </head>
//         <body>
//           <div id="print-content">
//             ${document.querySelector(".print-content").outerHTML}
//           </div>
//           <script>
//             window.onload = function() {
//               window.print();
//               window.onafterprint = function() {
//                 window.close();
//               };
//             };
//           </script>
//         </body>
//       </html>
//     `);
//     printWindow.document.close();
//   };

//   return (
//     <Box sx={{ height: "10vh", display: "flex", flexDirection: "column" }}>
//       <Box sx={{ height: "10vh" }}>
//         <Container maxWidth="lg" sx={{ height: "10%" }}>
//           <Box sx={{ display: "none" }}>
//             <PartLabel
//               partNo={selectedPartNo}
//               logoUrl={logoIcon}
//               partName={selectedPart.partName}
//               quantity={selectedPart.quantity}
//             />
//           </Box>

//           <Grid container spacing={2} sx={{ height: "10%" }}>
//             {/* Part Details Section */}
//             <Grid item xs={6}>
//               <Paper sx={{ p: 2, height: "100%" }}>
//                 <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
//                   <IconButton size="small" sx={{ mr: 1 }}>
//                     <SettingsIcon color="primary" />
//                   </IconButton>
//                   <Typography variant="h6" color="primary">
//                     Part Details
//                   </Typography>
//                 </Box>

//                 <Grid container spacing={2}>
//                   <Grid item xs={12} md={8}>
//                     <FormControl fullWidth disabled={isLoading}>
//                       <InputLabel>Part No</InputLabel>
//                       <Select
//                         value={selectedPartNo}
//                         onChange={handlePartNoChange}
//                         label="Part No"
//                         autoFocus
//                       >
//                         <MenuItem value="">
//                           <em>None</em>
//                         </MenuItem>
//                         {parts.map((part) => (
//                           <MenuItem key={part._id} value={part.partNo}>
//                             {part.partNo}
//                           </MenuItem>
//                         ))}
//                       </Select>
//                     </FormControl>
//                   </Grid>

//                   <Grid item xs={12} md={4}>
//                     <Paper
//                       variant="outlined"
//                       sx={{ p: 2, textAlign: "center" }}
//                     >
//                       <Typography variant="subtitle2" color="text.secondary">
//                         Packing Quantity
//                       </Typography>
//                       <Typography variant="h4" color="primary" sx={{ mt: 1 }}>
//                         {selectedPart.quantity || "0"}
//                       </Typography>
//                     </Paper>
//                   </Grid>

//                   <Grid item xs={12}>
//                     <TextField
//                       label="Part Name"
//                       value={selectedPart.partName}
//                       fullWidth
//                       InputProps={{ readOnly: true }}
//                     />
//                   </Grid>
//                 </Grid>
//               </Paper>
//             </Grid>

//             {/* Scan Details Section */}
//             <Grid item xs={6}>
//               <Paper sx={{ p: 2, height: "100%" }}>
//                 <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
//                   <IconButton size="small" sx={{ mr: 1 }}>
//                     <QrCodeScannerIcon color="primary" />
//                   </IconButton>
//                   <Typography variant="h6" color="primary">
//                     Scan Details
//                   </Typography>
//                 </Box>

//                 <Grid container spacing={2}>
//                   <Grid item xs={12} md={6}>
//                     <Box sx={{ mb: 2 }}>
//                       <Box
//                         sx={{
//                           display: "flex",
//                           justifyContent: "space-between",
//                           mb: 1,
//                         }}
//                       >
//                         <Typography variant="subtitle1" color="text.secondary">
//                           Current Package Progress
//                         </Typography>
//                         <Typography
//                           variant="subtitle1"
//                           color="primary"
//                           sx={{ fontWeight: "medium" }}
//                         >
//                           {scannedQuantity} / {selectedPart.quantity || 0}
//                         </Typography>
//                       </Box>
//                       <LinearProgress
//                         variant="determinate"
//                         value={
//                           selectedPart.quantity
//                             ? (scannedQuantity /
//                                 Number(selectedPart.quantity)) *
//                               100
//                             : 0
//                         }
//                         sx={{
//                           height: 8,
//                           borderRadius: 1,
//                           backgroundColor: "grey.200",
//                           "& .MuiLinearProgress-bar": {
//                             backgroundColor: "primary.main",
//                           },
//                         }}
//                       />
//                     </Box>
//                   </Grid>
//                   <Grid item xs={12} md={6}>
//                     <Paper
//                       sx={{
//                         p: 2,
//                         textAlign: "center",
//                         bgcolor:
//                           status === "PASS ✅"
//                             ? "success.light"
//                             : status === "Fail 🚫"
//                             ? "error.light"
//                             : "warning.light",
//                         color: "white",
//                       }}
//                     >
//                       <Typography variant="h5">{status}</Typography>
//                     </Paper>
//                   </Grid>

//                   <Grid item xs={12}>
//                     <TextField
//                       label="Scan Quantity"
//                       inputRef={scanQuantityRef}
//                       value={scanQuantity}
//                       onChange={handleScanQuantityChange}
//                       fullWidth
//                       autoComplete="off"
//                     />
//                   </Grid>
//                 </Grid>
//               </Paper>
//             </Grid>

//             <Grid item xs={12}>
//               <Grid container spacing={2}>
//                 <Grid item xs={12} sm={4}>
//                   <Paper
//                     sx={{
//                       p: 2,
//                       textAlign: "center",
//                       height: "100%",
//                       display: "flex",
//                       flexDirection: "column",
//                       justifyContent: "center",
//                     }}
//                   >
//                     <IconButton sx={{ mb: 1 }}>
//                       <InventoryIcon color="primary" fontSize="large" />
//                     </IconButton>
//                     <Typography variant="h6" color="primary" gutterBottom>
//                       Total Part Count
//                     </Typography>
//                     <Typography variant="h4">{totalPartCount}</Typography>
//                   </Paper>
//                 </Grid>

//                 <Grid item xs={12} sm={4}>
//                   <Paper
//                     sx={{
//                       p: 2,
//                       textAlign: "center",
//                       height: "100%",
//                       display: "flex",
//                       flexDirection: "column",
//                       justifyContent: "center",
//                     }}
//                   >
//                     <IconButton sx={{ mb: 1 }}>
//                       <LocalShippingIcon color="primary" fontSize="large" />
//                     </IconButton>
//                     <Typography variant="h6" color="primary" gutterBottom>
//                       Current Part Packages
//                     </Typography>
//                     <Typography variant="h4">
//                       {selectedPart.packageCount || 0}
//                     </Typography>
//                   </Paper>
//                 </Grid>

//                 <Grid item xs={12} sm={4}>
//                   <Paper
//                     sx={{
//                       p: 2,
//                       textAlign: "center",
//                       height: "100%",
//                       display: "flex",
//                       flexDirection: "column",
//                       justifyContent: "center",
//                     }}
//                   >
//                     <IconButton sx={{ mb: 1 }}>
//                       <LocalShippingIcon color="primary" fontSize="large" />
//                     </IconButton>
//                     <Typography variant="h6" color="primary" gutterBottom>
//                       Total Package Count
//                     </Typography>
//                     <Typography variant="h4">{totalPackageCount}</Typography>
//                   </Paper>
//                 </Grid>
//               </Grid>
//             </Grid>
//           </Grid>
//         </Container>
//       </Box>
//     </Box>
//   );
// };

// export default User;
