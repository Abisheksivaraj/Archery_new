import React, { useState, useEffect } from "react";
import {
  Search,
  RefreshCw,
  Calendar,
  Package,
  Truck,
  Hash,
  Download,
  FileText,
  FileSpreadsheet,
  File,
  Menu,
  X,
  ChevronDown,
  Filter,
} from "lucide-react";

// Mock API for demonstration
const mockApi = {
  get: async (url) => {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const mockData = [
      {
        _id: "1",
        vendorCode: "V001",
        invoiceNumber: "INV-2024-001",
        partNumber: "P12345",
        date: "2024-01-15",
        vehicleNumber: "TN01AB1234",
        quantity: "100",
        poNumber: "PO-2024-001",
        scannedAt: "2024-01-15T10:30:00Z",
      },
      {
        _id: "2",
        vendorCode: "V002",
        invoiceNumber: "INV-2024-002",
        partNumber: "P67890",
        date: "2024-01-16",
        vehicleNumber: "TN02CD5678",
        quantity: "50",
        poNumber: "PO-2024-002",
        scannedAt: "2024-01-16T14:45:00Z",
      },
      {
        _id: "3",
        vendorCode: "V003",
        invoiceNumber: "INV-2024-003",
        partNumber: "P11111",
        date: "2024-01-17",
        vehicleNumber: "TN03EF9012",
        quantity: "75",
        poNumber: "PO-2024-003",
        scannedAt: "2024-01-17T09:15:00Z",
      },
    ];
    return { data: { success: true, data: mockData } };
  },
};

const DataTable = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchField, setSearchField] = useState("invoiceNumber");
  const [exporting, setExporting] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);

  // Fetch data from backend
  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await mockApi.get("/api/scan/data");
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
      const response = await mockApi.get(`/api/scan/data/search?${queryParam}`);
      const result = response.data;

      if (result.success) {
        setData(result.data);
        setError(null);
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

  // Export to CSV
  const exportToCSV = () => {
    if (data.length === 0) {
      alert("No data to export");
      return;
    }

    setExporting(true);

    try {
      const headers = [
        "Vendor Code",
        "Invoice No",
        "Part No",
        "Date",
        "Vehicle No",
        "Quantity",
        "PO Number",
        "Scanned At",
      ];

      // Add BOM for proper UTF-8 encoding
      const BOM = "\uFEFF";

      const csvContent =
        BOM +
        [
          headers.join(","),
          ...data.map((item) =>
            [
              `"${(item.vendorCode || "N/A").toString().replace(/"/g, '""')}"`,
              `"${(item.invoiceNumber || "N/A")
                .toString()
                .replace(/"/g, '""')}"`,
              `"${(item.partNumber || "N/A").toString().replace(/"/g, '""')}"`,
              `"${(item.date || "N/A").toString().replace(/"/g, '""')}"`,
              `"${(item.vehicleNumber || "N/A")
                .toString()
                .replace(/"/g, '""')}"`,
              `"${(item.quantity || "N/A").toString().replace(/"/g, '""')}"`,
              `"${(item.poNumber || "N/A").toString().replace(/"/g, '""')}"`,
              `"${formatDate(item.scannedAt).replace(/"/g, '""')}"`,
            ].join(",")
          ),
        ].join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
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
  };

  // Export to Excel (Real Excel format)
  const exportToExcel = () => {
    if (data.length === 0) {
      alert("No data to export");
      return;
    }

    setExporting(true);

    try {
      // Create Excel XML format
      const excelHeader = `<?xml version="1.0"?>
        <Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
         xmlns:o="urn:schemas-microsoft-com:office:office"
         xmlns:x="urn:schemas-microsoft-com:office:excel"
         xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
         xmlns:html="http://www.w3.org/TR/REC-html40">
         <Worksheet ss:Name="Barcode Scan Data">
          <Table>`;

      const excelFooter = `  </Table>
         </Worksheet>
        </Workbook>`;

      // Create header row
      const headerRow = `
        <Row>
          <Cell><Data ss:Type="String">Vendor Code</Data></Cell>
          <Cell><Data ss:Type="String">Invoice No</Data></Cell>
          <Cell><Data ss:Type="String">Part No</Data></Cell>
          <Cell><Data ss:Type="String">Date</Data></Cell>
          <Cell><Data ss:Type="String">Vehicle No</Data></Cell>
          <Cell><Data ss:Type="String">Quantity</Data></Cell>
          <Cell><Data ss:Type="String">PO Number</Data></Cell>
          <Cell><Data ss:Type="String">Scanned At</Data></Cell>
        </Row>`;

      // Create data rows
      const dataRows = data
        .map(
          (item) => `
        <Row>
          <Cell><Data ss:Type="String">${item.vendorCode || "N/A"}</Data></Cell>
          <Cell><Data ss:Type="String">${
            item.invoiceNumber || "N/A"
          }</Data></Cell>
          <Cell><Data ss:Type="String">${item.partNumber || "N/A"}</Data></Cell>
          <Cell><Data ss:Type="String">${item.date || "N/A"}</Data></Cell>
          <Cell><Data ss:Type="String">${
            item.vehicleNumber || "N/A"
          }</Data></Cell>
          <Cell><Data ss:Type="String">${item.quantity || "N/A"}</Data></Cell>
          <Cell><Data ss:Type="String">${item.poNumber || "N/A"}</Data></Cell>
          <Cell><Data ss:Type="String">${formatDate(
            item.scannedAt
          )}</Data></Cell>
        </Row>`
        )
        .join("");

      const excelContent = excelHeader + headerRow + dataRows + excelFooter;

      // Create and download file
      const blob = new Blob([excelContent], {
        type: "application/vnd.ms-excel;charset=utf-8;",
      });

      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute(
        "download",
        `barcode_scan_data_${new Date().getTime()}.xls`
      );
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error exporting to Excel:", error);
      alert("Error exporting to Excel: " + error.message);
    }

    setTimeout(() => setExporting(false), 1000);
  };

  // Export to PDF (using print functionality)
  const exportToPDF = () => {
    if (data.length === 0) {
      alert("No data to export");
      return;
    }

    setExporting(true);

    try {
      // Create a new window for printing
      const printWindow = window.open("", "_blank");

      const tableRows = data
        .map(
          (item) => `
        <tr>
          <td style="border: 1px solid #ddd; padding: 8px;">${
            item.vendorCode || "N/A"
          }</td>
          <td style="border: 1px solid #ddd; padding: 8px;">${
            item.invoiceNumber || "N/A"
          }</td>
          <td style="border: 1px solid #ddd; padding: 8px;">${
            item.partNumber || "N/A"
          }</td>
          <td style="border: 1px solid #ddd; padding: 8px;">${
            item.date || "N/A"
          }</td>
          <td style="border: 1px solid #ddd; padding: 8px;">${
            item.vehicleNumber || "N/A"
          }</td>
          <td style="border: 1px solid #ddd; padding: 8px;">${
            item.quantity || "N/A"
          }</td>
          <td style="border: 1px solid #ddd; padding: 8px;">${
            item.poNumber || "N/A"
          }</td>
          <td style="border: 1px solid #ddd; padding: 8px;">${formatDate(
            item.scannedAt
          )}</td>
        </tr>
      `
        )
        .join("");

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Barcode Scan Data Report</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .report-info { margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; }
            th { background-color: #f5f5f5; border: 1px solid #ddd; padding: 10px; font-weight: bold; }
            td { border: 1px solid #ddd; padding: 8px; }
            tr:nth-child(even) { background-color: #f9f9f9; }
            .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #666; }
            @media print {
              body { margin: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Barcode Scan Data Report</h1>
            <div class="report-info">
              <p>Generated on: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
              <p>Total Records: ${data.length}</p>
            </div>
          </div>
          
          <table>
            <thead>
              <tr>
                <th>Vendor Code</th>
                <th>Invoice No</th>
                <th>Part No</th>
                <th>Date</th>
                <th>Vehicle No</th>
                <th>Quantity</th>
                <th>PO Number</th>
                <th>Scanned At</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>
          
          <div class="footer">
            <p>End of Report</p>
          </div>
          
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() {
                window.close();
              }, 1000);
            }
          </script>
        </body>
        </html>
      `;

      printWindow.document.write(htmlContent);
      printWindow.document.close();
    } catch (error) {
      console.error("Error exporting to PDF:", error);
      alert("Error exporting to PDF: " + error.message);
    }

    setTimeout(() => setExporting(false), 1000);
  };

  // Initial data fetch
  useEffect(() => {
    fetchData();
  }, []);

  // Handle Enter key in search
  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64 p-4">
        <div className="flex items-center space-x-2">
          <RefreshCw className="animate-spin w-5 h-5 text-blue-500" />
          <span className="text-gray-600">Loading data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-4 lg:p-6 bg-white rounded-lg shadow-sm">
      <div className="mb-4 sm:mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4">
          Barcode Scan Data
        </h2>

        {/* Mobile Header Controls */}
        <div className="flex flex-col space-y-3 sm:hidden">
          <div className="flex justify-between items-center">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-md"
            >
              <Filter className="w-4 h-4" />
              <span>Filters</span>
              <ChevronDown
                className={`w-4 h-4 transform transition-transform ${
                  showFilters ? "rotate-180" : ""
                }`}
              />
            </button>

            <div className="relative">
              <button
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="flex items-center space-x-2 px-4 py-2 bg-green-500 text-white rounded-md"
                disabled={data.length === 0}
              >
                <Download className="w-4 h-4" />
                <span>Export</span>
                <ChevronDown
                  className={`w-4 h-4 transform transition-transform ${
                    showExportMenu ? "rotate-180" : ""
                  }`}
                />
              </button>

              {/* Mobile Export Menu */}
              {showExportMenu && (
                <div className="absolute right-0 top-full mt-2 w-32 bg-white border border-gray-200 rounded-md shadow-lg z-10">
                  <button
                    onClick={() => {
                      exportToCSV();
                      setShowExportMenu(false);
                    }}
                    disabled={exporting}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center space-x-2"
                  >
                    <FileText className="w-4 h-4" />
                    <span>CSV</span>
                  </button>
                  <button
                    onClick={() => {
                      exportToExcel();
                      setShowExportMenu(false);
                    }}
                    disabled={exporting}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center space-x-2"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>Excel</span>
                  </button>
                  <button
                    onClick={() => {
                      exportToPDF();
                      setShowExportMenu(false);
                    }}
                    disabled={exporting}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center space-x-2"
                  >
                    <File className="w-4 h-4" />
                    <span>PDF</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Mobile Search Controls */}
          {showFilters && (
            <div className="space-y-3 p-4 bg-gray-50 rounded-md">
              <select
                value={searchField}
                onChange={(e) => setSearchField(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="invoiceNumber">Invoice No</option>
                <option value="vendorCode">Vendor Code</option>
                <option value="partNumber">Part No</option>
                <option value="vehicleNumber">Vehicle No</option>
                <option value="poNumber">PO Number</option>
              </select>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex space-x-2">
                <button
                  onClick={handleSearch}
                  className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                >
                  Search
                </button>
                <button
                  onClick={() => {
                    setSearchTerm("");
                    fetchData();
                  }}
                  className="flex-1 px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
                >
                  Reset
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Desktop Controls */}
        <div className="hidden sm:flex flex-wrap gap-4 items-center justify-between">
          <div className="flex flex-wrap gap-4 items-center">
            <select
              value={searchField}
              onChange={(e) => setSearchField(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="invoiceNumber">Invoice No</option>
              <option value="vendorCode">Vendor Code</option>
              <option value="partNumber">Part No</option>
              <option value="vehicleNumber">Vehicle No</option>
              <option value="poNumber">PO Number</option>
            </select>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={handleKeyPress}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 w-48 lg:w-64"
              />
            </div>

            <button
              onClick={handleSearch}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Search
            </button>

            <button
              onClick={() => {
                setSearchTerm("");
                fetchData();
              }}
              className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              Reset
            </button>
          </div>

          {/* Desktop Export Buttons */}
          <div className="flex gap-2">
            <button
              onClick={exportToCSV}
              disabled={exporting || data.length === 0}
              className="flex items-center space-x-1 px-3 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FileText className="w-4 h-4" />
              <span className="hidden md:inline">CSV</span>
            </button>

            <button
              onClick={exportToExcel}
              disabled={exporting || data.length === 0}
              className="flex items-center space-x-1 px-3 py-2 bg-emerald-500 text-white rounded-md hover:bg-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span className="hidden md:inline">Excel</span>
            </button>

            <button
              onClick={exportToPDF}
              disabled={exporting || data.length === 0}
              className="flex items-center space-x-1 px-3 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <File className="w-4 h-4" />
              <span className="hidden md:inline">PDF</span>
            </button>

            {exporting && (
              <div className="flex items-center space-x-1 px-3 py-2 bg-gray-100 text-gray-600 rounded-md">
                <Download className="w-4 h-4 animate-bounce" />
                <span className="hidden sm:inline">Exporting...</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      {/* Mobile Card View */}
      <div className="block md:hidden">
        {data.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Package className="w-12 h-12 mx-auto mb-2 text-gray-300" />
            <p>No data available</p>
          </div>
        ) : (
          <div className="space-y-4">
            {data.map((item, index) => (
              <div
                key={item._id || index}
                className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm"
              >
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-500 text-xs">Vendor Code</span>
                    <p className="font-medium text-gray-900">
                      {item.vendorCode || "N/A"}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-500 text-xs">Invoice No</span>
                    <p className="font-medium text-blue-600">
                      {item.invoiceNumber || "N/A"}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-500 text-xs">Part No</span>
                    <p className="font-medium text-gray-900">
                      {item.partNumber || "N/A"}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-500 text-xs">Date</span>
                    <p className="font-medium text-gray-900">
                      {item.date || "N/A"}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-500 text-xs">Vehicle No</span>
                    <p className="font-medium text-gray-900">
                      {item.vehicleNumber || "N/A"}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-500 text-xs">Quantity</span>
                    <p className="font-medium text-gray-900">
                      {item.quantity || "N/A"}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-gray-500 text-xs">PO Number</span>
                    <p className="font-medium text-gray-900">
                      {item.poNumber || "N/A"}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-gray-500 text-xs">Scanned At</span>
                    <p className="text-gray-600 text-xs">
                      {formatDate(item.scannedAt)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block">
        <div className="overflow-x-auto -mx-3 sm:-mx-4 lg:-mx-6">
          <div className="inline-block min-w-full py-2 align-middle px-3 sm:px-4 lg:px-6">
            <table className="min-w-full bg-white border border-gray-200 rounded-lg">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 lg:px-4 py-3 text-left text-xs lg:text-sm font-medium text-gray-700 border-b">
                    <div className="flex items-center space-x-1">
                      <Hash className="w-4 h-4" />
                      <span className="hidden lg:inline">Vendor Code</span>
                      <span className="lg:hidden">Vendor</span>
                    </div>
                  </th>
                  <th className="px-3 lg:px-4 py-3 text-left text-xs lg:text-sm font-medium text-gray-700 border-b">
                    <div className="flex items-center space-x-1">
                      <Package className="w-4 h-4" />
                      <span className="hidden lg:inline">Invoice No</span>
                      <span className="lg:hidden">Invoice</span>
                    </div>
                  </th>
                  <th className="px-3 lg:px-4 py-3 text-left text-xs lg:text-sm font-medium text-gray-700 border-b">
                    <div className="flex items-center space-x-1">
                      <Package className="w-4 h-4" />
                      <span className="hidden lg:inline">Part No</span>
                      <span className="lg:hidden">Part</span>
                    </div>
                  </th>
                  <th className="px-3 lg:px-4 py-3 text-left text-xs lg:text-sm font-medium text-gray-700 border-b">
                    <div className="flex items-center space-x-1">
                      <Calendar className="w-4 h-4" />
                      <span>Date</span>
                    </div>
                  </th>
                  <th className="px-3 lg:px-4 py-3 text-left text-xs lg:text-sm font-medium text-gray-700 border-b">
                    <div className="flex items-center space-x-1">
                      <Truck className="w-4 h-4" />
                      <span className="hidden lg:inline">Vehicle No</span>
                      <span className="lg:hidden">Vehicle</span>
                    </div>
                  </th>
                  <th className="px-3 lg:px-4 py-3 text-left text-xs lg:text-sm font-medium text-gray-700 border-b">
                    <span className="hidden lg:inline">Quantity</span>
                    <span className="lg:hidden">Qty</span>
                  </th>
                  <th className="px-3 lg:px-4 py-3 text-left text-xs lg:text-sm font-medium text-gray-700 border-b">
                    <span className="hidden lg:inline">PO Number</span>
                    <span className="lg:hidden">PO</span>
                  </th>
                  <th className="px-3 lg:px-4 py-3 text-left text-xs lg:text-sm font-medium text-gray-700 border-b">
                    <span className="hidden lg:inline">Scanned At</span>
                    <span className="lg:hidden">Scanned</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.length === 0 ? (
                  <tr>
                    <td
                      colSpan="8"
                      className="px-4 py-8 text-center text-gray-500"
                    >
                      <div className="flex flex-col items-center">
                        <Package className="w-12 h-12 mb-2 text-gray-300" />
                        <p>No data available</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  data.map((item, index) => (
                    <tr
                      key={item._id || index}
                      className="hover:bg-gray-50 border-b border-gray-100"
                    >
                      <td className="px-3 lg:px-4 py-3 text-xs lg:text-sm text-gray-900">
                        {item.vendorCode || "N/A"}
                      </td>
                      <td className="px-3 lg:px-4 py-3 text-xs lg:text-sm font-medium text-gray-900">
                        {item.invoiceNumber || "N/A"}
                      </td>
                      <td className="px-3 lg:px-4 py-3 text-xs lg:text-sm text-gray-900">
                        {item.partNumber || "N/A"}
                      </td>
                      <td className="px-3 lg:px-4 py-3 text-xs lg:text-sm text-gray-900">
                        {item.date || "N/A"}
                      </td>
                      <td className="px-3 lg:px-4 py-3 text-xs lg:text-sm text-gray-900">
                        {item.vehicleNumber || "N/A"}
                      </td>
                      <td className="px-3 lg:px-4 py-3 text-xs lg:text-sm text-gray-900">
                        {item.quantity || "N/A"}
                      </td>
                      <td className="px-3 lg:px-4 py-3 text-xs lg:text-sm text-gray-900">
                        {item.poNumber || "N/A"}
                      </td>
                      <td className="px-3 lg:px-4 py-3 text-xs lg:text-sm text-gray-500">
                        <span className="hidden lg:inline">
                          {formatDate(item.scannedAt)}
                        </span>
                        <span className="lg:hidden">
                          {formatDate(item.scannedAt).split(" ")[0]}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {data.length > 0 && (
        <div className="mt-4 flex flex-col sm:flex-row justify-between items-center space-y-2 sm:space-y-0 text-sm text-gray-600">
          <span className="text-center sm:text-left">
            Showing {data.length} record{data.length !== 1 ? "s" : ""}
          </span>
          <button
            onClick={fetchData}
            className="flex items-center space-x-1 px-3 py-1 text-blue-500 hover:text-blue-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh</span>
          </button>
        </div>
      )}

      {/* Click outside to close menus */}
      {(showExportMenu || showFilters) && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => {
            setShowExportMenu(false);
            setShowFilters(false);
          }}
        />
      )}
    </div>
  );
};

export default DataTable;
