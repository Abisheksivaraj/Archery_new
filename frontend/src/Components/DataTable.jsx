import React, { useState, useEffect } from "react";
import {
  Search,
  RefreshCw,
  Calendar,
  Package,
  Truck,
  Hash,
} from "lucide-react";
import { api } from "../apiConfig";

const DataTable = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchField, setSearchField] = useState("invoiceNumber");

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
      <div className="flex items-center justify-center min-h-64">
        <div className="flex items-center space-x-2">
          <RefreshCw className="animate-spin w-5 h-5 text-blue-500" />
          <span className="text-gray-600">Loading data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow-sm">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Barcode Scan Data
        </h2>

        {/* Search Controls */}
        <div className="flex flex-wrap gap-4 items-center mb-4">
          <div className="flex items-center space-x-2">
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
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
              />
            </div>

            <button
              onClick={handleSearch}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Search
            </button>

            <button
              onClick={fetchData}
              className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-200 rounded-lg">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 border-b">
                <div className="flex items-center space-x-1">
                  <Hash className="w-4 h-4" />
                  <span>Vendor Code</span>
                </div>
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 border-b">
                <div className="flex items-center space-x-1">
                  <Package className="w-4 h-4" />
                  <span>Invoice No</span>
                </div>
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 border-b">
                <div className="flex items-center space-x-1">
                  <Package className="w-4 h-4" />
                  <span>Part No</span>
                </div>
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 border-b">
                <div className="flex items-center space-x-1">
                  <Calendar className="w-4 h-4" />
                  <span>Date</span>
                </div>
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 border-b">
                <div className="flex items-center space-x-1">
                  <Truck className="w-4 h-4" />
                  <span>Vehicle No</span>
                </div>
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 border-b">
                Quantity
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 border-b">
                PO Number
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 border-b">
                Scanned At
              </th>
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td colSpan="8" className="px-4 py-8 text-center text-gray-500">
                  No data available
                </td>
              </tr>
            ) : (
              data.map((item, index) => (
                <tr
                  key={item._id || index}
                  className="hover:bg-gray-50 border-b border-gray-100"
                >
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {item.vendorCode || "N/A"}
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">
                    {item.invoiceNumber || "N/A"}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {item.partNumber || "N/A"}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {item.date || "N/A"}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {item.vehicleNumber || "N/A"}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {item.quantity || "N/A"}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {item.poNumber || "N/A"}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {formatDate(item.scannedAt)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {data.length > 0 && (
        <div className="mt-4 flex justify-between items-center text-sm text-gray-600">
          <span>Showing {data.length} records</span>
          <button
            onClick={fetchData}
            className="flex items-center space-x-1 px-3 py-1 text-blue-500 hover:text-blue-700"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default DataTable;
