import React, { useState, useEffect } from "react";
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TextField,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Typography,
  Card,
  CardContent,
  Grid,
  IconButton,
  Chip,
  CircularProgress,
  Alert,
  Stack,
  useMediaQuery,
  useTheme,
  Menu,
  ListItemIcon,
  ListItemText,
  Collapse,
  InputAdornment,
} from "@mui/material";
import {
  Search as SearchIcon,
  Refresh as RefreshIcon,
  Download as DownloadIcon,
  FilterList as FilterListIcon,
  PictureAsPdf as PdfIcon,
  TableChart as ExcelIcon,
  Description as CsvIcon,
  MoreVert as MoreVertIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
} from "@mui/icons-material";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

// Note: Replace this with your actual API import
import { api } from "../apiConfig";

const DataTable = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const isTablet = useMediaQuery(theme.breakpoints.down("lg"));

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchField, setSearchField] = useState("invoiceNumber");
  const [exporting, setExporting] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [exportAnchorEl, setExportAnchorEl] = useState(null);

  // Pagination state
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Fetch data from backend
  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await api.get("/api/scan/data");
      const result = response.data;

      if (result.success) {
        setData(result.data);
        setError(null);
      } else {
        setError("Failed to fetch data");
      }
    } catch (err) {
      setError("Error connecting to server");
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  // Search functionality
  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      fetchData();
      return;
    }

    try {
      setLoading(true);
      const queryParam = `${searchField}=${encodeURIComponent(searchTerm)}`;
      const response = await api.get(`/api/scan/data/search?${queryParam}`);
      const result = response.data;

      if (result.success) {
        setData(result.data);
        setError(null);
        setPage(0); // Reset to first page
      } else {
        setError("Search failed");
      }
    } catch (err) {
      setError("Search error");
      console.error("Search error:", err);
    } finally {
      setLoading(false);
    }
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString() + " " + date.toLocaleTimeString();
    } catch {
      return dateString;
    }
  };

  // Prepare data for export
  const prepareExportData = () => {
    return data.map((item) => ({
      "Vendor Code": item.vendorCode || "N/A",
      "Invoice No": item.invoiceNumber || "N/A",
      "Part No": item.partNumber || "N/A",
      Date: item.date || "N/A",
      "Vehicle No": item.vehicleNumber || "N/A",
      Quantity: item.quantity || "N/A",
      "PO Number": item.poNumber || "N/A",
      "Scanned At": formatDate(item.scannedAt),
    }));
  };

  // Export to CSV
  const exportToCSV = () => {
    if (data.length === 0) {
      alert("No data to export");
      return;
    }

    setExporting(true);

    try {
      const exportData = prepareExportData();
      const headers = Object.keys(exportData[0]);

      const csvContent = [
        headers.join(","),
        ...exportData.map((row) =>
          headers
            .map((header) => `"${String(row[header]).replace(/"/g, '""')}"`)
            .join(",")
        ),
      ].join("\n");

      const BOM = "\uFEFF";
      const blob = new Blob([BOM + csvContent], {
        type: "text/csv;charset=utf-8;",
      });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);

      link.setAttribute("href", url);
      link.setAttribute(
        "download",
        `barcode_scan_data_${new Date().getTime()}.csv`
      );
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error exporting to CSV:", error);
      alert("Error exporting to CSV: " + error.message);
    }

    setTimeout(() => setExporting(false), 1000);
    setExportAnchorEl(null);
  };

  // Export to Excel
  const exportToExcel = () => {
    if (data.length === 0) {
      alert("No data to export");
      return;
    }

    setExporting(true);

    try {
      const exportData = prepareExportData();
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Barcode Data");

      // Auto-size columns
      const colWidths = Object.keys(exportData[0]).map((key) => ({
        wch: Math.max(
          key.length,
          ...exportData.map((row) => String(row[key]).length)
        ),
      }));
      worksheet["!cols"] = colWidths;

      XLSX.writeFile(
        workbook,
        `barcode_scan_data_${new Date().getTime()}.xlsx`
      );
    } catch (error) {
      console.error("Error exporting to Excel:", error);
      alert("Error exporting to Excel: " + error.message);
    }

    setTimeout(() => setExporting(false), 1000);
    setExportAnchorEl(null);
  };

  // Export to PDF - FIXED VERSION
  const exportToPDF = () => {
    if (data.length === 0) {
      alert("No data to export");
      return;
    }

    setExporting(true);

    try {
      const doc = new jsPDF("l", "mm", "a4"); // landscape orientation
      const exportData = prepareExportData();

      doc.setFontSize(16);
      doc.text("Barcode Scan Data", 14, 15);

      doc.setFontSize(10);
      doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 25);

      const headers = Object.keys(exportData[0]);
      const rows = exportData.map((item) =>
        headers.map((header) => item[header])
      );

      // Use autoTable function directly (imported separately)
      autoTable(doc, {
        head: [headers],
        body: rows,
        startY: 35,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [66, 139, 202] },
        margin: { top: 35, right: 14, bottom: 20, left: 14 },
      });

      doc.save(`barcode_scan_data_${new Date().getTime()}.pdf`);
    } catch (error) {
      console.error("Error exporting to PDF:", error);
      alert("Error exporting to PDF: " + error.message);
    }

    setTimeout(() => setExporting(false), 1000);
    setExportAnchorEl(null);
  };

  // Handle pagination
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Handle Enter key in search
  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  // Initial data fetch
  useEffect(() => {
    fetchData();
  }, []);

  // Reset page when data changes
  useEffect(() => {
    setPage(0);
  }, [data]);

  // Mobile Card Component
  const MobileCard = ({ item, index }) => (
    <Card sx={{ mb: 2, boxShadow: 1 }}>
      <CardContent sx={{ pb: 2 }}>
        <Grid container spacing={2}>
          <Grid item xs={6}>
            <Typography variant="caption" color="text.secondary">
              Vendor Code
            </Typography>
            <Typography variant="body2" fontWeight="medium">
              {item.vendorCode || "N/A"}
            </Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="caption" color="text.secondary">
              Invoice No
            </Typography>
            <Typography variant="body2" fontWeight="medium" color="primary">
              {item.invoiceNumber || "N/A"}
            </Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="caption" color="text.secondary">
              Part No
            </Typography>
            <Typography variant="body2">{item.partNumber || "N/A"}</Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="caption" color="text.secondary">
              Date
            </Typography>
            <Typography variant="body2">{item.date || "N/A"}</Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="caption" color="text.secondary">
              Vehicle No
            </Typography>
            <Typography variant="body2">
              {item.vehicleNumber || "N/A"}
            </Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="caption" color="text.secondary">
              Quantity
            </Typography>
            <Chip
              label={item.quantity || "N/A"}
              size="small"
              color="success"
              variant="outlined"
            />
          </Grid>
          <Grid item xs={12}>
            <Typography variant="caption" color="text.secondary">
              PO Number
            </Typography>
            <Typography variant="body2">{item.poNumber || "N/A"}</Typography>
          </Grid>
          <Grid item xs={12}>
            <Typography variant="caption" color="text.secondary">
              Scanned At
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {formatDate(item.scannedAt)}
            </Typography>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="400px"
        flexDirection="column"
        gap={2}
      >
        <CircularProgress />
        <Typography color="text.secondary">Loading data...</Typography>
      </Box>
    );
  }

  const paginatedData = data.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  return (
    <Box
      sx={{
        p: { xs: 1, sm: 2 },
        minHeight: "100vh",
        bgcolor: "grey.50",
      }}
    >
      <Paper sx={{ p: { xs: 1, sm: 2 } }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Search Controls */}
        <Box sx={{ mb: 2 }}>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={2}
            alignItems={{ xs: "stretch", sm: "center" }}
            justifyContent="flex-start"
          >
            {/* Field + Search */}
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2} flex={1}>
              <FormControl
                size="small"
                fullWidth={isMobile}
                sx={{ minWidth: { xs: "100%", sm: 140 } }}
              >
                <InputLabel>Search Field</InputLabel>
                <Select
                  value={searchField}
                  onChange={(e) => setSearchField(e.target.value)}
                  label="Search Field"
                >
                  <MenuItem value="invoiceNumber">Invoice No</MenuItem>
                  <MenuItem value="vendorCode">Vendor Code</MenuItem>
                  <MenuItem value="partNumber">Part No</MenuItem>
                  <MenuItem value="vehicleNumber">Vehicle No</MenuItem>
                  <MenuItem value="poNumber">PO Number</MenuItem>
                </Select>
              </FormControl>

              <TextField
                size="small"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={handleKeyPress}
                fullWidth
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Stack>

            {/* Search & Reset */}
            <Stack
              direction={{ xs: "row", sm: "row" }}
              spacing={2}
              sx={{ width: { xs: "100%", sm: "auto" } }}
            >
              <Button
                variant="contained"
                onClick={handleSearch}
                startIcon={<SearchIcon />}
                fullWidth={isMobile}
              >
                Search
              </Button>

              <Button
                variant="outlined"
                onClick={() => {
                  setSearchTerm("");
                  fetchData();
                }}
                startIcon={<RefreshIcon />}
                fullWidth={isMobile}
              >
                Reset
              </Button>
            </Stack>
          </Stack>

          {/* Export Buttons - put below on mobile */}
          <Stack
            direction={{ xs: "row", sm: "row" }}
            spacing={3}
            mt={{ xs: 2, sm: 2, lg: 2 }}
            justifyContent={{ xs: "center", sm: "flex-start" }}
          >
            <Button
              variant="contained"
              color="success"
              startIcon={<CsvIcon />}
              onClick={exportToCSV}
              disabled={exporting || data.length === 0}
              size="small"
              fullWidth={isMobile}
            >
              CSV
            </Button>
            <Button
              variant="contained"
              color="info"
              startIcon={<ExcelIcon />}
              onClick={exportToExcel}
              disabled={exporting || data.length === 0}
              size="small"
              fullWidth={isMobile}
            >
              Excel
            </Button>
            <Button
              variant="contained"
              color="error"
              startIcon={<PdfIcon />}
              onClick={exportToPDF}
              disabled={exporting || data.length === 0}
              size="small"
              fullWidth={isMobile}
            >
              PDF
            </Button>
          </Stack>
        </Box>

        {/* Data Display */}
        {data.length === 0 && !loading ? (
          <Box
            display="flex"
            flexDirection="column"
            alignItems="center"
            py={8}
            textAlign="center"
          >
            <SearchIcon sx={{ fontSize: 64, color: "grey.300", mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No data available
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Try adjusting your search criteria or refresh the page
            </Typography>
          </Box>
        ) : (
          <>
            {/* Mobile Cards */}
            {isMobile ? (
              <Box
                sx={{
                  maxHeight: {
                    xs: "calc(100vh - 320px)",
                    sm: "calc(100vh - 280px)",
                  },
                  overflow: "auto",
                  mb: 2,
                  scrollbarWidth: "thin",
                  "&::-webkit-scrollbar": {
                    width: "8px",
                  },
                  "&::-webkit-scrollbar-track": {
                    backgroundColor: "grey.100",
                    borderRadius: "4px",
                  },
                  "&::-webkit-scrollbar-thumb": {
                    backgroundColor: "grey.400",
                    borderRadius: "4px",
                  },
                }}
              >
                {paginatedData.map((item, index) => (
                  <MobileCard
                    key={item._id || index}
                    item={item}
                    index={index}
                  />
                ))}
              </Box>
            ) : (
              /* Desktop Table */
              <TableContainer
                component={Paper}
                sx={{
                  maxHeight: {
                    sm: "calc(100vh - 300px)",
                    md: "calc(100vh - 250px)",
                  },
                  mb: 2,
                  boxShadow: 1,
                  border: "1px solid",
                  borderColor: "grey.200",
                  overflow: "auto",
                  scrollbarWidth: "thin",
                  "&::-webkit-scrollbar": {
                    width: "8px",
                    height: "8px",
                  },
                  "&::-webkit-scrollbar-track": {
                    backgroundColor: "grey.100",
                    borderRadius: "4px",
                  },
                  "&::-webkit-scrollbar-thumb": {
                    backgroundColor: "grey.400",
                    borderRadius: "4px",
                  },
                }}
              >
                <Table stickyHeader size={isTablet ? "small" : "medium"}>
                  <TableHead>
                    <TableRow>
                      <TableCell
                        sx={{
                          backgroundColor: "primary.main",
                          color: "white",
                          fontWeight: "bold",
                          minWidth: "120px",
                        }}
                      >
                        Vendor Code
                      </TableCell>
                      <TableCell
                        sx={{
                          backgroundColor: "primary.main",
                          color: "white",
                          fontWeight: "bold",
                          minWidth: "140px",
                        }}
                      >
                        Invoice No
                      </TableCell>
                      <TableCell
                        sx={{
                          backgroundColor: "primary.main",
                          color: "white",
                          fontWeight: "bold",
                          minWidth: "140px",
                        }}
                      >
                        Part No
                      </TableCell>
                      <TableCell
                        sx={{
                          backgroundColor: "primary.main",
                          color: "white",
                          fontWeight: "bold",
                          minWidth: "120px",
                        }}
                      >
                        Date
                      </TableCell>
                      <TableCell
                        sx={{
                          backgroundColor: "primary.main",
                          color: "white",
                          fontWeight: "bold",
                          minWidth: "120px",
                        }}
                      >
                        Vehicle No
                      </TableCell>
                      <TableCell
                        sx={{
                          backgroundColor: "primary.main",
                          color: "white",
                          fontWeight: "bold",
                          minWidth: "100px",
                        }}
                      >
                        Quantity
                      </TableCell>
                      <TableCell
                        sx={{
                          backgroundColor: "primary.main",
                          color: "white",
                          fontWeight: "bold",
                          minWidth: "120px",
                        }}
                      >
                        PO Number
                      </TableCell>
                      <TableCell
                        sx={{
                          backgroundColor: "primary.main",
                          color: "white",
                          fontWeight: "bold",
                          minWidth: "180px",
                        }}
                      >
                        Scanned At
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {paginatedData.map((item, index) => (
                      <TableRow
                        key={item._id || index}
                        hover
                        sx={{
                          "&:nth-of-type(odd)": { bgcolor: "grey.50" },
                          "&:hover": { bgcolor: "grey.100" },
                        }}
                      >
                        <TableCell>{item.vendorCode || "N/A"}</TableCell>
                        <TableCell>
                          <Typography color="primary" fontWeight="medium">
                            {item.invoiceNumber || "N/A"}
                          </Typography>
                        </TableCell>
                        <TableCell>{item.partNumber || "N/A"}</TableCell>
                        <TableCell>{item.date || "N/A"}</TableCell>
                        <TableCell>{item.vehicleNumber || "N/A"}</TableCell>
                        <TableCell>
                          <Chip
                            label={item.quantity || "N/A"}
                            size="small"
                            color="success"
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>{item.poNumber || "N/A"}</TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">
                            {formatDate(item.scannedAt)}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}

            {/* Fixed Pagination Container */}
            <Paper
              elevation={2}
              sx={{
                position: "sticky",
                bottom: 0,
                zIndex: 10,
                backgroundColor: "white",
                borderTop: "1px solid",
                borderColor: "grey.200",
                mt: 2,
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  flexDirection: { xs: "column", sm: "row" },
                  justifyContent: "space-between",
                  alignItems: "center",
                  p: 2,
                  gap: 1,
                }}
              >
                <Typography variant="body2" color="text.secondary">
                  Total {data.length} record{data.length !== 1 ? "s" : ""}
                  {data.length > 0 && (
                    <>
                      {" • Showing "}
                      {page * rowsPerPage + 1}-
                      {Math.min((page + 1) * rowsPerPage, data.length)}
                    </>
                  )}
                </Typography>
                <TablePagination
                  component="div"
                  count={data.length}
                  page={page}
                  onPageChange={handleChangePage}
                  rowsPerPage={rowsPerPage}
                  onRowsPerPageChange={handleChangeRowsPerPage}
                  rowsPerPageOptions={[5, 10, 25, 50]}
                  showFirstButton
                  showLastButton
                  sx={{
                    "& .MuiTablePagination-toolbar": {
                      minHeight: { xs: "auto", sm: "52px" },
                      paddingLeft: { xs: 0, sm: 2 },
                      paddingRight: { xs: 0, sm: 2 },
                    },
                    "& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows":
                      {
                        fontSize: { xs: "0.75rem", sm: "0.875rem" },
                      },
                  }}
                />
              </Box>
            </Paper>
          </>
        )}

        {/* Export Status */}
        {exporting && (
          <Paper
            elevation={3}
            sx={{
              position: "fixed",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              p: 3,
              zIndex: 9999,
              minWidth: "200px",
              textAlign: "center",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <CircularProgress size={20} />
              <Typography variant="body2" color="text.secondary">
                Exporting data...
              </Typography>
            </Box>
          </Paper>
        )}
      </Paper>
    </Box>
  );
};

export default DataTable;
