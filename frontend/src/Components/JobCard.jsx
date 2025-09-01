import React, { useState, useEffect } from "react";
import { api } from "../apiConfig";

// Mock API for demonstration


const JobCard = () => {
  const [jobNo, setJobNo] = useState("");
  const [scannedData, setScannedData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    let barcodeBuffer = "";
    let barcodeTimeout;

    const handleKeyPress = (event) => {
      if (event.target.tagName === "INPUT") return;

      if (barcodeTimeout) {
        clearTimeout(barcodeTimeout);
      }

      barcodeBuffer += event.key;

      barcodeTimeout = setTimeout(() => {
        if (barcodeBuffer.length > 0) {
          processBarcode(barcodeBuffer);
        }
        barcodeBuffer = "";
      }, 100);
    };

    const processBarcode = async (barcode) => {
      const parsedData = parseBarcodeData(barcode);
      setJobNo(barcode);
      setScannedData(parsedData);

      // Automatically send to API when barcode is scanned
      await handleApiSubmission(barcode);
    };

    document.addEventListener("keypress", handleKeyPress);

    return () => {
      document.removeEventListener("keypress", handleKeyPress);
      if (barcodeTimeout) {
        clearTimeout(barcodeTimeout);
      }
    };
  }, []);

  const parseBarcodeData = (barcode) => {
    // Split the barcode data by spaces
    const parts = barcode.trim().split(/\s+/);

    return {
      vendorCode: parts[0] || "", // L059
      poNumber: parts[1] || "", // 1609036
      invoiceNumber: parts[2] || "", // 1B25007182
      date: parts[3] || "", // 20.06.2025
      field5: parts[4] || "", // 34AAACL3763E1ZS
      field6: parts[5] || "", // 651221.22
      field7: parts[6] || "", // 508766.58
      vehicleNumber: parts[7] || "", // HR55AR1081
      field9: parts[8] || "", // 0.00
      field10: parts[9] || "", // 142454.64
      field11: parts[10] || "", // 0.00
      partNumber: parts[11] || "", // 31400M52T10
      field13: parts[12] || "", // 85114000
      quantity: parts[13] || "", // 126
      field15: parts[14] || "", // 4037.83
      rawData: barcode,
      parsedParts: parts,
      totalParts: parts.length,
    };
  };

  // API function to submit barcode data
  const submitBarcodeToApi = async (barcodeData) => {
    console.log("🚀 Sending to API:", { barcodeData });

    try {
      const response = await api.post("/api/scan", {
        barcodeData,
      });

      const data = response.data;
      console.log("✅ API Response:", data);

      if (!data.success) {
        throw new Error(data.message || "Failed to submit barcode");
      }

      return data;
    } catch (error) {
      console.error("❌ API Error:", error);
      if (error.response) {
        console.error("❌ Response data:", error.response.data);
        console.error("❌ Response status:", error.response.status);
        throw new Error(error.response.data.message || "Server error");
      }
      throw error;
    }
  };

  // Handle API submission
  const handleApiSubmission = async (barcodeData) => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await submitBarcodeToApi(barcodeData);

      if (result.success) {
        setSuccess(
          `Data saved successfully! Invoice: ${result.data.invoiceNumber}`
        );

        // Auto-clear input field after successful submission
        setTimeout(() => {
          setJobNo("");
          setScannedData(null);
          setSuccess(null);
        }, 2000); // Clear after 2 seconds to show success message
      } else {
        setError(result.message || "Failed to save data");
      }
    } catch (err) {
      if (err.message.includes("already exists")) {
        setError(`Duplicate invoice detected: ${err.message}`);
      } else if (err.message.includes("Validation failed")) {
        setError(`Validation error: Missing required fields`);
      } else {
        setError(err.message || "Network error occurred");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleManualInput = async (event) => {
    const value = event.target.value;
    setJobNo(value);
    setError(null);
    setSuccess(null);

    if (value.length > 0) {
      const parsedData = parseBarcodeData(value);
      setScannedData(parsedData);

      // Auto-submit when input length seems valid
      if (value.length > 10) {
        await handleApiSubmission(value);
      }
    } else {
      setScannedData(null);
    }
  };

  const handleProcessData = async (data = scannedData) => {
    if (!data || !data.rawData) {
      setError("No data to process");
      return;
    }

    await handleApiSubmission(data.rawData);
  };

  const clearData = () => {
    setJobNo("");
    setScannedData(null);
    setError(null);
    setSuccess(null);
  };

  // Get recent scans
  const fetchRecentScans = async () => {
    try {
      const response = await api.get(`/api/scan/recent?limit=5`);
      const data = response.data;

      if (data.success) {
        console.log("Recent scans:", data.data);
        alert("Recent scans fetched! Check console for details.");
      }
    } catch (err) {
      console.error("Failed to fetch recent scans:", err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile-first header */}
      <div className="bg-white shadow-sm border-b lg:hidden">
        <div className="px-4 py-3">
          <h1 className="text-xl font-bold text-gray-800">
            📱 Barcode Scanner
          </h1>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 lg:py-8">
        {/* Desktop title - hidden on mobile */}
        <h1 className="hidden lg:block text-2xl font-bold text-gray-800 mb-6">
          📱 Barcode Scanner System
        </h1>

        {/* Responsive grid - stacks on mobile, side-by-side on desktop */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 lg:gap-8">
          {/* Left side - Scanner input */}
          <div className="bg-white rounded-lg shadow-md p-4 lg:p-6 order-1">
            <div className="mb-4">
              <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                📱 Barcode Input
              </label>
              <input
                type="text"
                value={jobNo}
                onChange={handleManualInput}
                placeholder="Scan barcode or enter manually"
                className="w-full px-3 py-2 lg:px-4 lg:py-3 text-base lg:text-lg border-2 border-gray-300 rounded-md focus:outline-none focus:border-blue-500 transition-colors"
                disabled={loading}
              />
              <p className="text-xs lg:text-sm text-gray-500 mt-2">
                Scan a barcode or type manually. Data will be parsed and saved
                automatically.
              </p>
            </div>

            {/* Status Messages */}
            {loading && (
              <div className="mb-4 p-3 lg:p-4 bg-blue-50 border border-blue-200 rounded-md">
                <div className="flex items-center text-blue-800">
                  <div className="flex-shrink-0">
                    <svg
                      className="animate-spin h-4 w-4 lg:h-5 lg:w-5"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                  </div>
                  <div className="ml-2 lg:ml-3">
                    <p className="text-xs lg:text-sm font-medium">
                      Saving data to server...
                    </p>
                  </div>
                </div>
              </div>
            )}

            {success && (
              <div className="mb-4 p-3 lg:p-4 bg-green-50 border border-green-200 rounded-md">
                <div className="flex items-start text-green-800">
                  <div className="flex-shrink-0 mt-0.5">
                    <svg
                      className="h-4 w-4 lg:h-5 lg:w-5"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <div className="ml-2 lg:ml-3">
                    <p className="text-xs lg:text-sm font-medium break-words">
                      {success}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="mb-4 p-3 lg:p-4 bg-red-50 border border-red-200 rounded-md">
                <div className="flex items-start text-red-800">
                  <div className="flex-shrink-0 mt-0.5">
                    <svg
                      className="h-4 w-4 lg:h-5 lg:w-5"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <div className="ml-2 lg:ml-3">
                    <p className="text-xs lg:text-sm font-medium break-words">
                      {error}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Action buttons - responsive layout */}
            {scannedData && (
              <div className="mt-4 space-y-3">
                {!success && !error && (
                  <div className="p-3 lg:p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                    <div className="flex items-start text-yellow-800">
                      <div className="flex-shrink-0 mt-0.5">
                        <svg
                          className="h-4 w-4 lg:h-5 lg:w-5"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                      <div className="ml-2 lg:ml-3">
                        <p className="text-xs lg:text-sm font-medium">
                          Data parsed! Found {scannedData.totalParts} fields.
                          {!loading &&
                            " Click 'Process Data' to save manually."}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Button group - responsive stacking */}
                <div className="flex flex-col sm:flex-row gap-2 lg:gap-3">
                  <button
                    onClick={clearData}
                    className="flex-1 bg-gray-500 hover:bg-gray-600 text-white font-medium lg:font-bold py-2 lg:py-3 px-3 lg:px-4 rounded-md transition-colors duration-200 text-sm lg:text-base"
                    disabled={loading}
                  >
                    Clear Data
                  </button>
                  <button
                    onClick={fetchRecentScans}
                    className="flex-1 bg-indigo-500 hover:bg-indigo-600 text-white font-medium lg:font-bold py-2 lg:py-3 px-3 lg:px-4 rounded-md transition-colors duration-200 text-sm lg:text-base"
                    disabled={loading}
                  >
                    View Recent
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right side - Scanned data display */}
          <div className="bg-white rounded-lg shadow-md p-4 lg:p-6 order-2 xl:order-2">
            <h2 className="text-lg lg:text-xl font-bold text-gray-800 mb-4">
              📄 Parsed Data
            </h2>

            {scannedData ? (
              <div className="space-y-4 max-h-[60vh] lg:max-h-[70vh] xl:max-h-[calc(100vh-12rem)] overflow-y-auto">
                {/* Primary Fields - Responsive grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-3 lg:gap-4">
                  <div className="bg-blue-50 p-3 rounded-md border-l-4 border-blue-500">
                    <label className="text-xs font-semibold text-blue-600 uppercase tracking-wide">
                      Vendor Code
                    </label>
                    <p className="text-base lg:text-lg font-bold text-gray-900 mt-1 break-all">
                      {scannedData.vendorCode || "N/A"}
                    </p>
                  </div>

                  <div className="bg-green-50 p-3 rounded-md border-l-4 border-green-500">
                    <label className="text-xs font-semibold text-green-600 uppercase tracking-wide">
                      PO Number
                    </label>
                    <p className="text-base lg:text-lg font-bold text-gray-900 mt-1 break-all">
                      {scannedData.poNumber || "N/A"}
                    </p>
                  </div>

                  <div className="bg-purple-50 p-3 rounded-md border-l-4 border-purple-500">
                    <label className="text-xs font-semibold text-purple-600 uppercase tracking-wide">
                      Invoice Number
                    </label>
                    <p className="text-base lg:text-lg font-bold text-gray-900 mt-1 break-all">
                      {scannedData.invoiceNumber || "N/A"}
                    </p>
                  </div>

                  <div className="bg-orange-50 p-3 rounded-md border-l-4 border-orange-500">
                    <label className="text-xs font-semibold text-orange-600 uppercase tracking-wide">
                      Date
                    </label>
                    <p className="text-base lg:text-lg font-bold text-gray-900 mt-1 break-all">
                      {scannedData.date || "N/A"}
                    </p>
                  </div>

                  <div className="bg-red-50 p-3 rounded-md border-l-4 border-red-500">
                    <label className="text-xs font-semibold text-red-600 uppercase tracking-wide">
                      Vehicle Number
                    </label>
                    <p className="text-base lg:text-lg font-bold text-gray-900 mt-1 break-all">
                      {scannedData.vehicleNumber || "N/A"}
                    </p>
                  </div>

                  <div className="bg-indigo-50 p-3 rounded-md border-l-4 border-indigo-500">
                    <label className="text-xs font-semibold text-indigo-600 uppercase tracking-wide">
                      Part Number
                    </label>
                    <p className="text-base lg:text-lg font-bold text-gray-900 mt-1 break-all">
                      {scannedData.partNumber || "N/A"}
                    </p>
                  </div>

                  <div className="bg-pink-50 p-3 rounded-md border-l-4 border-pink-500 sm:col-span-2 xl:col-span-1">
                    <label className="text-xs font-semibold text-pink-600 uppercase tracking-wide">
                      Quantity
                    </label>
                    <p className="text-base lg:text-lg font-bold text-gray-900 mt-1 break-all">
                      {scannedData.quantity || "N/A"}
                    </p>
                  </div>
                </div>

                {/* Additional Fields - Collapsible on mobile */}
                <div className="mt-6">
                  <h3 className="text-base lg:text-lg font-semibold text-gray-700 mb-3">
                    Additional Fields
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3 gap-2 lg:gap-3">
                    {[
                      { label: "Field 5", value: scannedData.field5 },
                      { label: "Field 6", value: scannedData.field6 },
                      { label: "Field 7", value: scannedData.field7 },
                      { label: "Field 9", value: scannedData.field9 },
                      { label: "Field 10", value: scannedData.field10 },
                      { label: "Field 11", value: scannedData.field11 },
                      { label: "Field 13", value: scannedData.field13 },
                      { label: "Field 15", value: scannedData.field15 },
                    ].map((field, index) => (
                      <div
                        key={index}
                        className="bg-gray-50 p-2 lg:p-3 rounded-md"
                      >
                        <label className="text-xs font-medium text-gray-500 uppercase block">
                          {field.label}
                        </label>
                        <p className="text-xs lg:text-sm font-semibold text-gray-900 mt-1 break-all">
                          {field.value || "N/A"}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Raw Data Section - Collapsible on mobile */}
                <div className="mt-6 p-3 lg:p-4 bg-gray-100 rounded-md">
                  <h3 className="text-sm lg:text-base font-semibold text-gray-700 mb-2">
                    Raw Data
                  </h3>
                  <div className="bg-white p-2 lg:p-3 rounded border max-h-24 lg:max-h-32 overflow-y-auto">
                    <p className="text-xs font-mono text-gray-600 break-all leading-relaxed">
                      {scannedData.rawData}
                    </p>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Total fields parsed: {scannedData.totalParts}
                  </p>
                </div>

                {/* Process button - Full width on mobile */}
                <div className="mt-6 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => handleProcessData(scannedData)}
                    className={`w-full font-medium lg:font-bold py-3 px-4 rounded-md transition-colors duration-200 flex items-center justify-center text-sm lg:text-base ${
                      loading
                        ? "bg-gray-400 cursor-not-allowed text-gray-200"
                        : success
                        ? "bg-green-600 hover:bg-green-700 text-white"
                        : "bg-blue-600 hover:bg-blue-700 text-white"
                    }`}
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <svg
                          className="animate-spin w-4 h-4 lg:w-5 lg:h-5 mr-2"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                            fill="none"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          />
                        </svg>
                        Saving...
                      </>
                    ) : success ? (
                      <>
                        <svg
                          className="w-4 h-4 lg:w-5 lg:h-5 mr-2"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                        Saved Successfully
                      </>
                    ) : (
                      <>
                        <svg
                          className="w-4 h-4 lg:w-5 lg:h-5 mr-2"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                          />
                        </svg>
                        Process Data
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              /* Empty state - responsive */
              <div className="text-center py-8 lg:py-12 flex flex-col justify-center min-h-[300px] lg:min-h-[400px]">
                <svg
                  className="w-12 h-12 lg:w-16 lg:h-16 text-gray-300 mx-auto mb-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <p className="text-gray-500 text-base lg:text-lg font-medium">
                  No data scanned yet
                </p>
                <p className="text-gray-400 text-xs lg:text-sm mt-2 px-4">
                  Scan or enter a barcode to see the parsed data here
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Demo helper - positioned at bottom on mobile */}
        <div className="mt-6 lg:mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm lg:text-base font-semibold text-blue-800 mb-2">
            🧪 Demo Mode
          </h3>
          <p className="text-xs lg:text-sm text-blue-700 mb-3">
            Try entering this sample barcode data:
          </p>
          <div className="bg-white p-2 lg:p-3 rounded border font-mono text-xs lg:text-sm break-all overflow-x-auto">
            L059 1609036 1B25007182 20.06.2025 34AAACL3763E1ZS 651221.22
            508766.58 HR55AR1081 0.00 142454.64 0.00 31400M52T10 85114000 126
            4037.83
          </div>
          <button
            onClick={() => {
              const sampleData =
                "L059 1609036 1B25007182 20.06.2025 34AAACL3763E1ZS 651221.22 508766.58 HR55AR1081 0.00 142454.64 0.00 31400M52T10 85114000 126 4037.83";
              setJobNo(sampleData);
              const parsedData = parseBarcodeData(sampleData);
              setScannedData(parsedData);
            }}
            className="mt-3 w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors duration-200 text-sm"
            disabled={loading}
          >
            Load Sample Data
          </button>
        </div>
      </div>
    </div>
  );
};

export default JobCard;
