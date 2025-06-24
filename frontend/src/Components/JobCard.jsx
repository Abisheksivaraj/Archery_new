import React, { useState, useEffect } from "react";
import barcode1 from "../assets/barcode1.png";
import barcode2 from "../assets/barcode2.png";
import barcode3 from "../assets/barcode3.png";

const JobCard = () => {
  const [jobNo, setJobNo] = useState("");
  const [scannedData, setScannedData] = useState(null);

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

    const processBarcode = (barcode) => {
      const parsedData = parseBarcodeData(barcode);
      setJobNo(barcode);
      setScannedData(parsedData);

      setTimeout(() => {
        handlePrint(parsedData);
      }, 500);
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
    // Get current date in DDMMYYYY format
    const currentDate = new Date();
    const day = String(currentDate.getDate()).padStart(2, "0");
    const month = String(currentDate.getMonth() + 1).padStart(2, "0");
    const year = currentDate.getFullYear();
    const formattedDate = `${day}${month}${year}`;

    return {
      jobNo: barcode, // Always use the scanned/entered value
      partNo: "11711-F2050",
      partNoDrawing: "A148197-1STD2",
      customer: "TIEI",
      lotNo: "H5F",
      size: "STD 2",
      qty: "261 Pcs",
      description: "155Y Bearing Crankshaft No:01",
      date: formattedDate,
      rCode: "R002",
      pageNo: "28",
    };
  };

  const handleManualInput = (event) => {
    const value = event.target.value;
    setJobNo(value);

    if (value.length > 0) {
      const parsedData = parseBarcodeData(value);
      setScannedData(parsedData);
      setTimeout(() => {
        handlePrint(parsedData);
      }, 500);
    }
  };

  const handlePrint = (data = scannedData) => {
    if (!data) return;

    const originalContent = document.body.innerHTML;
    const originalTitle = document.title;

    const printContent = generatePrintLabel(data);

    const printStyles = `
      <style>
        @page {
          size: 150mm 60mm;
          margin: 0;
        }
        body {
          margin: 0;
          padding: 0;
          font-family: Arial, sans-serif;
          background: white;
          width: 150mm;
          height: 60mm;
          overflow: hidden;
          color: black;
          font-weight: bold;
        }
        .label {
          width: 150mm;
          height: 60mm;
          border: 3px solid black;
          background: white;
          display: flex;
          flex-direction: column;
          box-sizing: border-box;
          position: relative;
        }
        .top-section {
          height: 50%;
          display: flex;
          border-bottom: 3px solid black;
        }
        .job-section {
          width: 45%;
          padding: 2mm;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }
        .job-label {
          font-size: 10pt;
          font-weight: bold;
          margin-bottom: 1mm;
          color: black;
        }
        .job-number {
          font-size: 32pt;
          font-weight: bold;
          line-height: 1;
          margin-top:4mm;
          
        }
        .barcode-section {
          width: 35%;
          padding: 1mm;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          border-right: 3px solid black;
        }
        .info-section {
          width: 20%;
          display: flex;
          flex-direction: column;
        }
        .info-row {
          flex: 1;
          display: flex;
          border-bottom: 3px solid black;
        }
        .info-row:last-child {
          border-bottom: none;
        }
        .info-label {
          color: black;
          font-size: 7pt;
          font-weight: bold;
          padding: 1mm;
          width: 40%;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .info-value {
          font-size: 8pt;
          font-weight: bold;
          padding: 1mm;
          width: 60%;
          display: flex;
          align-items: center;
          justify-content: center;
          border-left: 3px solid black;
          color: black;
        }
        .bottom-section {
          height: 50%;
          display: flex;
          flex-direction: column;
        }
        .part-row {
          height: 100%;
          display: flex;
          position: relative;
        }
        .part-label-section {
          width: 15%;
          display: flex;
          flex-direction: column;
          justify-content: flex-start;
          align-items: flex-start;
          padding: 2mm;
        }
        .part-label {
          font-size: 6pt;
          font-weight: bold;
          color: black;
        }
        .part-barcode-section {
          width: 25%;
          padding: 2mm;
          display: flex;
          flex-direction: column;
          justify-content: flex-start;
          align-items: center;
        }
        .barcode3-section {
          width: 30%;
          padding: 2mm;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
        }
        .date-section {
          width: 30%;
          padding: 2mm;
          display: flex;
          flex-direction: column;
          justify-content: flex-start;
          align-items: flex-start;
        }
        .barcode-image {
          max-height: 15mm;
          max-width: 100%;
          object-fit: contain;
          margin-bottom: 1mm;
        }
        .part-barcode-image {
          max-height: 20mm;
          max-width: 100%;
          object-fit: contain;
          margin-bottom: 2mm;
        }
        .barcode3-image {
          max-height: 12mm;
          max-width: 100%;
          object-fit: contain;
          margin-bottom: 2mm;
        }
        .barcode-text {
          font-size: 14pt;
          font-weight: bold;
          text-align: center;
          color: black;
        }
        .part-barcode-text {
          font-size: 14pt;
          font-weight: bold;
          text-align: center;
          white-space: nowrap;
          color: black;
        }
        .barcode3-text {
          font-size: 12pt;
          font-weight: bold;
          text-align: center;
          white-space: nowrap;
          color: black;
        }
        .description-text {
          font-size: 12pt;
          font-weight: bold;
          text-align: center;
          margin-top: 2mm;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          color: black;
        }
        .r-code {
          font-size: 12pt;
          font-weight: bold;
          text-align: center;
          margin-top: 1mm;
          color: black;
        }
        .date-text {
          font-size: 10pt;
          font-weight: bold;
          text-align: left;
          color: black;
        }
        .page-number {
          position: absolute;
          bottom: 2mm;
          right: 2mm;
          font-size: 12pt;
          font-weight: bold;
          background: white;
          z-index: 10;
          color: black;
        }
      </style>
    `;

    document.title = "Print Job Card";
    document.body.innerHTML = printStyles + printContent;

    setTimeout(() => {
      window.print();

      setTimeout(() => {
        document.title = originalTitle;
        document.body.innerHTML = originalContent;
        setJobNo("");
        setScannedData(null);
        setTimeout(() => {
          window.location.reload();
        }, 100);
      }, 500);
    }, 100);
  };

  const generatePrintLabel = (data) => {
    if (!data) return "";

    return `
      <div class="label">
        <div class="top-section">
          <div class="job-section">
            <div class="job-label">Part No (for FG/WH)</div>
            <div class="job-number ">J.No: ${data.jobNo}</div>
          </div>
          <div class="barcode-section">
            <img src="${barcode1}" alt="R-Code Barcode" class="barcode-image" />
            <div class="r-code">${data.rCode}</div>
          </div>
          <div class="info-section">
            <div class="info-row">
              <div class="info-label">Lot No.</div>
              <div class="info-value">${data.lotNo}</div>
            </div>
            <div class="info-row">
              <div class="info-label">Customer</div>
              <div class="info-value">${data.customer}</div>
            </div>
            <div class="info-row">
              <div class="info-label">Size</div>
              <div class="info-value">${data.size}</div>
            </div>
            <div class="info-row">
              <div class="info-label">Qty</div>
              <div class="info-value">${data.qty}</div>
            </div>
          </div>
        </div>
        
        <div class="bottom-section">
          <div class="part-row">
            <div class="part-label-section">
              <div class="part-label w-[30rem]">Part No as Per Dwg.</div>
            </div>
            <div class="part-barcode-section  mt-5 -ml-20">
              <img src="${barcode2}" alt="Part Number Barcode" class="part-barcode-image" />
              <div class="part-barcode-text">${data.partNo}</div>
            </div>
            <div class="barcode3-section ml-[8rem]">
              <img src="${barcode3}" alt="Part Drawing Barcode" class="barcode3-image" />
              <div class="barcode3-text">${data.partNoDrawing}</div>
              <div class="description-text">${data.description}</div>
            </div>
            <div class="date-section">
              <div class="date-text mt-[2.7rem]">Dt: ${data.date}</div>
              <div class="page-number">${data.pageNo}</div>
            </div>
          </div>
        </div>
      </div>
    `;
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-8">
          Job Card Scanner - Exact Label Design
        </h1>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="mb-4">
            <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
              📱 Job No (60x150mm Label)
            </label>
            <input
              type="text"
              value={jobNo}
              onChange={handleManualInput}
              placeholder="Scan barcode or enter manually"
              className="w-full px-4 py-3 text-lg border-2 border-gray-300 rounded-md focus:outline-none focus:border-blue-500 transition-colors"
            />
            <p className="text-sm text-gray-500 mt-2">
              Scan a barcode or type manually. Print dialog opens automatically
              with exact 60x150mm dimensions.
            </p>
          </div>

          {scannedData && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-md">
              <div className="flex items-center text-green-800">
                <div className="flex-shrink-0">
                  <svg
                    className="h-5 w-5"
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
                <div className="ml-3">
                  <p className="text-sm font-medium">
                    Data scanned successfully! Preparing to print exact label
                    design...
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default JobCard;
