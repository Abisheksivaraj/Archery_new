import React, { useState, useEffect } from "react";
import { CSVLink } from "react-csv";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { api } from "../apiConfig";

const PackageTable = () => {
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 0,
    totalCount: 0,
    hasNextPage: false,
    hasPrevPage: false,
  });

  // Search states
  const [searchField, setSearchField] = useState("invoiceNumber");
  const [searchValue, setSearchValue] = useState("");
  const [appliedSearch, setAppliedSearch] = useState({
    field: "",
    value: "",
  });

  // Filter states
  const [filters, setFilters] = useState({
    page: 1,
    limit: 10,
    status: "",
    binNo: "",
    invoiceNumber: "",
    partNumber: "",
    sortBy: "createdAt",
    sortOrder: "desc",
  });

  // CSV data for export
  const [csvData, setCsvData] = useState([]);

  // Get user from localStorage on component mount
  useEffect(() => {
    try {
      const userStr = localStorage.getItem("user");
      if (userStr) {
        const user = JSON.parse(userStr);
        setCurrentUser(user);
      }
    } catch (err) {
      console.error("Error reading user from localStorage:", err);
    }
  }, []);

  // Fetch packages data
  const fetchPackages = async () => {
    try {
      setLoading(true);
      setError(null);

      // Build query parameters
      const queryParams = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) queryParams.append(key, value);
      });

      const response = await api.get(`/api/bindata?${queryParams.toString()}`);

      if (response.data.success) {
        setPackages(response.data.data);
        setPagination(response.data.pagination);
        // Prepare CSV data whenever packages are updated
        prepareCsvData(response.data.data);
      } else {
        setError(response.data.message || "Failed to fetch packages");
      }
    } catch (err) {
      console.error("Error fetching packages:", err);
      setError(err.response?.data?.message || "Error fetching packages");
    } finally {
      setLoading(false);
    }
  };

  // Get serial numbers from parsedData
  const getSerialNumbers = (pkg) => {
    // First, check if pkg has serialNumbers array (from BinData model)
    if (pkg.serialNumbers && Array.isArray(pkg.serialNumbers)) {
      // Extract the serial property from each object in the array
      return pkg.serialNumbers.map((item) => item.serial);
    }

    // Fallback to parsedData if serialNumbers doesn't exist
    if (pkg.parsedData && pkg.parsedData.serialNo) {
      // Check if serialNo is a string with comma-separated values
      if (typeof pkg.parsedData.serialNo === "string") {
        return pkg.parsedData.serialNo.split(",").map((s) => s.trim());
      }
      // If it's already an array
      if (Array.isArray(pkg.parsedData.serialNo)) {
        return pkg.parsedData.serialNo;
      }
      // If it's a single number
      return [pkg.parsedData.serialNo.toString()];
    }

    // Return empty array if no serial numbers found
    return [];
  };

  // Get scanned by name from localStorage or package data
  const getScannedByName = (pkg) => {
    // First check if package has scannedBy field
    if (pkg.scannedBy) {
      return pkg.scannedBy;
    }
    // Otherwise use current user from localStorage
    if (currentUser) {
      return (
        currentUser.name ||
        currentUser.username ||
        currentUser.email ||
        "Unknown"
      );
    }
    return "Unknown";
  };

  // Prepare CSV data
  const prepareCsvData = (data) => {
    const csvFormattedData = data.map((pkg, index) => {
      const serialNumbers = getSerialNumbers(pkg);
      return {
        "S.No.": getSerialNumber(index),
        "Bin No": pkg.binNo || pkg.parsedData?.binNo || "N/A",
        "Serial Numbers":
          serialNumbers.length > 0 ? serialNumbers.join(", ") : "No serials",
        "Scanned By": getScannedByName(pkg),
        "Invoice No": pkg.invoiceNumber,
        "Part No": pkg.partNumber || pkg.parsedData?.partNo || "N/A",
        Date: formatDate(pkg.createdAt),
        Quantity: pkg.quantity || serialNumbers.length,
        Status: pkg.status?.toUpperCase() || "UNKNOWN",
        "Scanned At": formatDate(pkg.createdAt),
      };
    });
    setCsvData(csvFormattedData);
  };

  // Fetch data on component mount and when filters change
  useEffect(() => {
    fetchPackages();
  }, [filters]);

  // Handle search
  const handleSearch = () => {
    setAppliedSearch({ field: searchField, value: searchValue });
    setFilters((prev) => ({
      ...prev,
      [searchField]: searchValue,
      page: 1,
    }));
  };

  // Handle reset
  const handleReset = () => {
    setSearchValue("");
    setAppliedSearch({ field: "", value: "" });
    setFilters({
      page: 1,
      limit: 10,
      status: "",
      binNo: "",
      invoiceNumber: "",
      partNumber: "",
      sortBy: "createdAt",
      sortOrder: "desc",
    });
  };

  // Handle page change
  const handlePageChange = (newPage) => {
    setFilters((prev) => ({
      ...prev,
      page: newPage,
    }));
  };

  // Handle sorting
  const handleSort = (column) => {
    const newSortOrder =
      filters.sortBy === column && filters.sortOrder === "asc" ? "desc" : "asc";
    setFilters((prev) => ({
      ...prev,
      sortBy: column,
      sortOrder: newSortOrder,
      page: 1,
    }));
  };

  // Generate 3-digit serial number
  const getSerialNumber = (index) => {
    const serialNo = (pagination.currentPage - 1) * filters.limit + index + 1;
    return serialNo.toString().padStart(3, "0");
  };

  // Format date
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-GB", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Get status badge style
  const getStatusBadge = (status) => {
    const statusColors = {
      created: "bg-blue-100 text-blue-800 border border-blue-200",
      printed: "bg-yellow-100 text-yellow-800 border border-yellow-200",
      shipped: "bg-green-100 text-green-800 border border-green-200",
      delivered: "bg-purple-100 text-purple-800 border border-purple-200",
      success: "bg-green-100 text-green-800 border border-green-200",
    };

    return (
      <span
        className={`px-3 py-1 text-xs font-medium rounded-full ${
          statusColors[status?.toLowerCase()] ||
          "bg-gray-100 text-gray-800 border border-gray-200"
        }`}
      >
        {status?.toUpperCase() || "UNKNOWN"}
      </span>
    );
  };

  // Excel Export Function
  const handleExcelExport = () => {
    const excelData = packages.map((pkg, index) => {
      const serialNumbers = getSerialNumbers(pkg);
      return {
        "S.No.": getSerialNumber(index),
        "Bin No": pkg.binNo || pkg.parsedData?.binNo || "N/A",
        "Serial Numbers":
          serialNumbers.length > 0 ? serialNumbers.join(", ") : "No serials",
        "Scanned By": getScannedByName(pkg),
        "Invoice No": pkg.invoiceNumber,
        "Part No": pkg.partNumber || pkg.parsedData?.partNo || "N/A",
        Date: formatDate(pkg.createdAt),
        Quantity: pkg.quantity || serialNumbers.length,
        Status: pkg.status?.toUpperCase() || "UNKNOWN",
        "Scanned At": formatDate(pkg.createdAt),
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();

    // Set column widths
    const columnWidths = [
      { wch: 8 },
      { wch: 15 },
      { wch: 30 },
      { wch: 15 },
      { wch: 15 },
      { wch: 15 },
      { wch: 18 },
      { wch: 10 },
      { wch: 12 },
      { wch: 18 },
    ];
    worksheet["!cols"] = columnWidths;

    XLSX.utils.book_append_sheet(workbook, worksheet, "Packages");

    const currentDate = new Date().toISOString().split("T")[0];
    const filename = `packages_export_${currentDate}.xlsx`;

    XLSX.writeFile(workbook, filename);
  };

  // PDF Export Function
  const handlePdfExport = () => {
    try {
      const doc = new jsPDF("l", "mm", "a4"); // landscape, millimeters, A4

      // Add title
      doc.setFontSize(18);
      doc.text("Bin Data Export Report", 15, 15);

      doc.setFontSize(10);
      doc.text(`Date: ${new Date().toLocaleDateString()}`, 15, 22);
      doc.text(`Total Records: ${packages.length}`, 15, 27);

      // Prepare the table body
      const body = packages.map((pkg, index) => {
        const serials = getSerialNumbers(pkg);
        return [
          (index + 1).toString(),
          pkg.binNo || "N/A",
          serials.join(", ") || "No serials",
          getScannedByName(pkg),
          pkg.invoiceNumber || "N/A",
          pkg.partNumber || "N/A",
          new Date(pkg.createdAt).toLocaleDateString("en-GB"),
          (pkg.quantity || serials.length).toString(),
          pkg.status?.toUpperCase() || "PENDING",
        ];
      });

      // Generate the table using autoTable function
      autoTable(doc, {
        head: [
          [
            "#",
            "Bin",
            "Serials",
            "Scanned By",
            "Invoice",
            "Part",
            "Date",
            "Qty",
            "Status",
          ],
        ],
        body: body,
        startY: 32,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [41, 128, 185] },
      });

      // Save
      doc.save(`bin_data_${Date.now()}.pdf`);

      alert("PDF exported successfully!");
    } catch (error) {
      console.error("PDF Export Error:", error);
      alert("Failed to export PDF. Check console for details.");
    }
  };

  // Handle export functions
  const handleExport = (format) => {
    console.log("Export format:", format);
    switch (format) {
      case "excel":
        console.log("Calling Excel export");
        handleExcelExport();
        break;
      case "pdf":
        console.log("Calling PDF export");
        handlePdfExport();
        break;
      default:
        console.log(`Unknown format: ${format}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="flex items-center justify-center p-16">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <span className="ml-4 text-gray-600 text-lg">
            Loading packages...
          </span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="p-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md mx-auto">
            <div className="text-red-800">
              <h3 className="text-lg font-medium">Error</h3>
              <p className="text-sm mt-2">{error}</p>
              <button
                onClick={fetchPackages}
                className="mt-4 bg-red-600 text-white px-4 py-2 rounded-md text-sm hover:bg-red-700 transition-colors"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-6">
        {/* Search Section */}
        <div className="bg-white rounded-lg border mb-6 p-4">
          <div className="flex items-center space-x-4 mb-4">
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">
                Search Field
              </label>
              <select
                value={searchField}
                onChange={(e) => setSearchField(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="invoiceNumber">Invoice No</option>
                <option value="binNo">Bin No</option>
                <option value="partNumber">Part No</option>
              </select>
            </div>

            <div className="flex-1 flex items-center space-x-2">
              <input
                type="text"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                placeholder="Search..."
                className="flex-1 border border-gray-300 rounded-md px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                onKeyPress={(e) => e.key === "Enter" && handleSearch()}
              />
              <button
                onClick={handleSearch}
                className="bg-blue-600 text-white px-6 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                SEARCH
              </button>
              <button
                onClick={handleReset}
                className="bg-gray-600 text-white px-6 py-2 rounded-md text-sm font-medium hover:bg-gray-700 transition-colors"
              >
                RESET
              </button>
            </div>
          </div>

          {/* Export Buttons */}
          <div className="flex items-center space-x-3">
            <CSVLink
              data={csvData}
              filename={`packages_export_${
                new Date().toISOString().split("T")[0]
              }.csv`}
              className="bg-green-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-green-700 transition-colors flex items-center space-x-1 no-underline"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <span>CSV</span>
            </CSVLink>

            <button
              onClick={() => handleExport("excel")}
              className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors flex items-center space-x-1"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <span>EXCEL</span>
            </button>

            <button
              onClick={() => handleExport("pdf")}
              className="bg-red-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-red-700 transition-colors flex items-center space-x-1"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <span>PDF</span>
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg border overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium">
                    S.No.
                  </th>
                  <th
                    className="px-4 py-3 text-left text-sm font-medium cursor-pointer hover:bg-blue-400 transition-colors"
                    onClick={() => handleSort("binNo")}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Bin No</span>
                      {filters.sortBy === "binNo" && (
                        <span>{filters.sortOrder === "asc" ? "↑" : "↓"}</span>
                      )}
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium">
                    Serial Numbers
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium">
                    Scanned By
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium">
                    Invoice No
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium">
                    Part No
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium">
                    Quantity
                  </th>
                  <th
                    className="px-4 py-3 text-left text-sm font-medium cursor-pointer hover:bg-blue-400 transition-colors"
                    onClick={() => handleSort("status")}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Status</span>
                      {filters.sortBy === "status" && (
                        <span>{filters.sortOrder === "asc" ? "↑" : "↓"}</span>
                      )}
                    </div>
                  </th>
                  <th
                    className="px-4 py-3 text-left text-sm font-medium cursor-pointer hover:bg-blue-400 transition-colors"
                    onClick={() => handleSort("createdAt")}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Scanned At</span>
                      {filters.sortBy === "createdAt" && (
                        <span>{filters.sortOrder === "asc" ? "↑" : "↓"}</span>
                      )}
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {packages.length === 0 ? (
                  <tr>
                    <td
                      colSpan="10"
                      className="px-4 py-12 text-center text-gray-500"
                    >
                      <div className="flex flex-col items-center space-y-2">
                        <svg
                          className="w-12 h-12 text-gray-300"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                          />
                        </svg>
                        <p className="text-lg">No packages found</p>
                        <p className="text-sm">
                          Try adjusting your search criteria
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  packages.map((pkg, index) => {
                    const serialNumbers = getSerialNumbers(pkg);
                    const scannedBy = getScannedByName(pkg);
                    const binNo = pkg.binNo || pkg.parsedData?.binNo || "N/A";

                    return (
                      <tr
                        key={pkg._id}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                          {getSerialNumber(index)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 font-medium">
                          {binNo}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {serialNumbers.length > 0 ? (
                              serialNumbers.map((serial, idx) => (
                                <span
                                  key={idx}
                                  className="inline-block bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-xs font-mono border border-blue-200"
                                >
                                  {serial}
                                </span>
                              ))
                            ) : (
                              <span className="text-gray-400 italic text-xs">
                                No serials
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          <div className="flex items-center space-x-2">
                            <span className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-medium">
                              {scannedBy.charAt(0).toUpperCase()}
                            </span>
                            <span className="font-medium">{scannedBy}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-blue-600 font-medium">
                          {pkg.invoiceNumber}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {pkg.partNumber || pkg.parsedData?.partNo || "N/A"}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {formatDate(pkg.createdAt)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 font-medium">
                          {pkg.quantity || serialNumbers.length}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {getStatusBadge(pkg.status || pkg.parseStatus)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {formatDate(pkg.createdAt)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="bg-gray-50 px-6 py-4 flex items-center justify-between border-t">
              <div className="flex items-center text-sm text-gray-700">
                <span className="mr-2">
                  Total {pagination.totalCount} records • Showing
                </span>
                <span className="font-medium">
                  {(pagination.currentPage - 1) * filters.limit + 1}-
                  {Math.min(
                    pagination.currentPage * filters.limit,
                    pagination.totalCount
                  )}
                </span>
              </div>

              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2 text-sm text-gray-700">
                  <span>Rows per page:</span>
                  <select
                    value={filters.limit}
                    onChange={(e) =>
                      setFilters((prev) => ({
                        ...prev,
                        limit: parseInt(e.target.value),
                        page: 1,
                      }))
                    }
                    className="border border-gray-300 rounded px-2 py-1 text-sm"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>

                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-700">
                    Page {pagination.currentPage} of {pagination.totalPages}
                  </span>
                  <button
                    onClick={() => handlePageChange(1)}
                    disabled={pagination.currentPage === 1}
                    className="p-1 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
                      />
                    </svg>
                  </button>
                  <button
                    onClick={() => handlePageChange(pagination.currentPage - 1)}
                    disabled={!pagination.hasPrevPage}
                    className="p-1 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 19l-7-7 7-7"
                      />
                    </svg>
                  </button>
                  <button
                    onClick={() => handlePageChange(pagination.currentPage + 1)}
                    disabled={!pagination.hasNextPage}
                    className="p-1 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </button>
                  <button
                    onClick={() => handlePageChange(pagination.totalPages)}
                    disabled={pagination.currentPage === pagination.totalPages}
                    className="p-1 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 5l7 7-7 7M5 5l7 7-7 7"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PackageTable;
