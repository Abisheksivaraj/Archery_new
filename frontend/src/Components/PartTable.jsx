import React, { useEffect, useState, useRef } from "react";
import Box from "@mui/material/Box";
import logoImage from "../assets/companyLogo.png";
import {
  Modal,
  Button,
  TextField,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import { toast } from "react-toastify";
import { QRCodeSVG } from "qrcode.react";
import { api } from "../apiConfig";

const PrintLabel = ({ partNo, logoUrl }) => {
  const isLongPartNo = partNo.length > 11;

  const labelStyle = {
    width: isLongPartNo ? "60mm" : "50mm",
    height: "25mm",
    padding: "2mm",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "white",
    border: "1px solid #ccc",
    boxSizing: "border-box",
    margin: "0 auto",
  };

  const textStyle = {
    margin: 0,
    fontSize: isLongPartNo ? "8px" : "10px",
    color: "black",
    fontWeight: "500",
    wordBreak: "break-all",
  };

  return (
    <div style={labelStyle} className="print-content">
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <img
          src={logoUrl}
          alt="Company Logo"
          style={{
            width: "20mm",
            height: "10mm",
            objectFit: "contain",
            marginBottom: "2mm",
          }}
        />
        <p style={textStyle}>PartNo: {partNo}</p>
      </div>
      <QRCodeSVG value={partNo} size={60} level="M" style={{ margin: 0 }} />
    </div>
  );
};

const Table = () => {
  const [parts, setParts] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedPart, setSelectedPart] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmPartNo, setDeleteConfirmPartNo] = useState("");
  const [partToDelete, setPartToDelete] = useState(null);
  const [updatedPart, setUpdatedPart] = useState({
    partName: "",
    partNo: "",
    quantity: "",
  });

  const printRef = useRef(null);
  const partsPerPage = 4;

  const handlePrint = () => {
    const printContent = document.createElement("div");
    printContent.innerHTML = printRef.current.innerHTML;

    const styles = `
      @page {
        size: 50mm 25mm;
        margin: 0;
      }
      body {
        margin: 0;
        display: flex;
        justify-content: center;
        align-items: center;
        height: 25mm;
      }
      .print-content {
        width: 50mm;
        height: 25mm;
        background-color: white;
      }
    `;

    const printWindow = window.open("", "", "height=500,width=800");
    printWindow.document.write(`
      <html>
        <head>
          <style>${styles}</style>
        </head>
        <body>
          ${printContent.innerHTML}
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 250);
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  useEffect(() => {
    const fetchParts = async () => {
      try {
        const response = await api.get("/getAllParts");
        setParts(response.data.parts);
      } catch (error) {
        console.error("Error fetching parts:", error);
        toast.error("Failed to fetch parts");
      }
    };
    fetchParts();
  }, []);

  const indexOfLastPart = currentPage * partsPerPage;
  const indexOfFirstPart = indexOfLastPart - partsPerPage;
  const currentParts = parts.slice(indexOfFirstPart, indexOfLastPart);
  const totalPages = Math.ceil(parts.length / partsPerPage);

  const handlePreview = (part) => {
    setSelectedPart(part);
    setIsEditMode(false);
  };

  const handleEdit = (part) => {
    setSelectedPart(part);
    setUpdatedPart({ ...part });
    setIsEditMode(true);
  };

  const handleSaveEdit = async () => {
    try {
      await api.put(`/editPart/${selectedPart._id}`, updatedPart);
      setParts(
        parts.map((part) =>
          part._id === selectedPart._id ? updatedPart : part
        )
      );
      setSelectedPart(null);
      setIsEditMode(false);
      toast.success("Part updated successfully!");
    } catch (error) {
      console.error("Error updating part:", error);
      toast.error("Error updating part!");
    }
  };

  const handleDeleteClick = (part) => {
    setPartToDelete(part);
    setDeleteDialogOpen(true);
    setDeleteConfirmPartNo("");
  };

  const handleDeleteConfirm = async () => {
    if (deleteConfirmPartNo !== partToDelete.partNo) {
      toast.error("Part number does not match. Please try again.", {
        position: toast.POSITION.TOP_RIGHT,
        autoClose: 3000,
      });
      // Close dialog even if part number doesn't match
      setDeleteDialogOpen(false);
      setPartToDelete(null);
      setDeleteConfirmPartNo("");
      return;
    }

    try {
      const response = await api.delete(`/deletePart/${partToDelete._id}`);

      if (response.status === 200) {
        // Update the parts list
        setParts(parts.filter((part) => part._id !== partToDelete._id));

        // Show success message
        toast.success("Part deleted successfully!", {
          position: toast.POSITION.TOP_RIGHT,
          autoClose: 3000,
        });
      } else {
        // Show error message
        toast.error("Failed to delete part. Please try again.", {
          position: toast.POSITION.TOP_RIGHT,
          autoClose: 3000,
        });
      }
    } catch (error) {
      console.error("Error deleting part:", error);
      toast.error(
        "An error occurred while deleting the part. Please try again.",
        {
          position: toast.POSITION.TOP_RIGHT,
          autoClose: 3000,
        }
      );
    } finally {
      // Always close the dialog and reset states regardless of success or failure
      setDeleteDialogOpen(false);
      setPartToDelete(null);
      setDeleteConfirmPartNo("");
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setPartToDelete(null);
    setDeleteConfirmPartNo("");
  };

  return (
    <div className="flex">
      <div className="w-full">
        {parts.length === 0 ? (
          <p className="text-center text-gray-400">No parts available</p>
        ) : (
          <div className="overflow-x-auto bg-gray-100 rounded-lg shadow-lg p-4">
            <table className="w-full table-auto border-collapse">
              <thead className="bg-[#7AD7F0] rounded-md text-gray-900">
                <tr>
                  <th className="py-3 px-6 text-center">S.no</th>
                  <th className="py-3 px-6 text-center">Part Name</th>
                  <th className="py-3 px-6 text-center">Part No</th>
                  <th className="py-3 px-6 text-center">Packing Quantity</th>
                  <th className="py-3 px-6 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {currentParts.map((part, index) => (
                  <tr key={part._id} className="transition-colors duration-200">
                    <td className="py-3 px-6 border-b text-center border-gray-700">
                      {index + 1 + (currentPage - 1) * partsPerPage}
                    </td>
                    <td className="py-3 px-6 text-center border-b border-gray-700">
                      {part.partName}
                    </td>
                    <td className="py-3 px-6 text-center border-b border-gray-700">
                      {part.partNo}
                    </td>
                    <td className="py-3 px-6 border-b text-center border-gray-700">
                      {part.quantity}
                    </td>
                    <td className="flex items-center justify-center h-20 gap-2 py-3 px-6 border-b border-gray-700">
                      <Tooltip title="Preview">
                        <Button
                          onClick={() => handlePreview(part)}
                          variant="contained"
                          style={{
                            backgroundColor: "white",
                            color: "white",
                            padding: "8px 16px",
                            borderRadius: "8px",
                          }}
                        >
                          🧐
                        </Button>
                      </Tooltip>

                      <Tooltip title="Edit">
                        <Button
                          onClick={() => handleEdit(part)}
                          variant="contained"
                          style={{
                            backgroundColor: "white",
                            color: "white",
                            padding: "8px 16px",
                            borderRadius: "8px",
                          }}
                        >
                          ✏️
                        </Button>
                      </Tooltip>

                      <Tooltip title="Delete">
                        <Button
                          onClick={() => handleDeleteClick(part)}
                          variant="contained"
                          style={{
                            backgroundColor: "white",
                            color: "white",
                            padding: "8px 16px",
                            borderRadius: "8px",
                          }}
                        >
                          🗑️
                        </Button>
                      </Tooltip>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="flex justify-between mt-4">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 text-white bg-gray-700 rounded disabled:opacity-50"
              >
                ⮜ Previous
              </button>
              <span className="text-gray-800">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() =>
                  setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                }
                disabled={currentPage === totalPages}
                className="px-4 py-2 text-white bg-gray-700 rounded disabled:opacity-50"
              >
                Next ⮞
              </button>
            </div>
          </div>
        )}
      </div>
      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleDeleteCancel}
        PaperProps={{
          style: {
            backgroundColor: "#1A1A1A",
            color: "#E0E0E0",
            borderRadius: "4px",
            padding: "24px",
            width: "40rem",
            border: "2px solid red",
            boxShadow: "0 0 20px rgba(255, 215, 0, 0.1)",
          },
        }}
      >
        <DialogTitle className="text-center font-bold text-xl">
          <div className="flex flex-col items-center border-b-2 border-yellow-500 pb-4">
            <span className="text-yellow-500 text-3xl">⚠️</span>
            <span className="mt-2 text-yellow-500">WARNING: Part Deletion</span>
          </div>
        </DialogTitle>
        <DialogContent>
          <div className="mt-4 text-center">
            <p className="text-gray-300">
              Please enter the part number to confirm deletion:
            </p>
            <p className="font-mono text-xl text-red-500 font-bold bg-black p-3 rounded border border-yellow-500">
              "{partToDelete?.partNo}"
            </p>
            <TextField
              autoFocus
              margin="dense"
              label="Enter Part Number"
              type="text"
              fullWidth
              value={deleteConfirmPartNo}
              onChange={(e) => setDeleteConfirmPartNo(e.target.value)}
              sx={{
                "& .MuiOutlinedInput-root": {
                  borderRadius: "4px",
                  backgroundColor: "#262626",
                  color: "#E0E0E0",
                  "& fieldset": { borderColor: "#404040" },
                  "&:hover fieldset": { borderColor: "#FFD700" },
                  "&.Mui-focused fieldset": { borderColor: "#FFD700" },
                },
                "& .MuiInputLabel-root": { color: "#808080" },
                "& .MuiInputBase-input": { color: "#E0E0E0" },
              }}
              onKeyPress={(e) => {
                if (e.key === "Enter" && deleteConfirmPartNo) {
                  handleDeleteConfirm();
                }
              }}
            />
          </div>
        </DialogContent>
        <DialogActions className="flex justify-center gap-3 pb-4">
          <Button
            onClick={handleDeleteCancel}
            variant="outlined"
            sx={{
              color: "#E0E0E0",
              borderColor: "#404040",
              "&:hover": { borderColor: "#FFD700", backgroundColor: "#262626" },
              textTransform: "uppercase",
              fontWeight: "bold",
            }}
          >
            Cancel
          </Button>

          <Button
            onClick={handleDeleteConfirm}
            variant="contained"
            disabled={!deleteConfirmPartNo}
            sx={{
              padding: "6px 16px",
              backgroundColor: "#CC0000",
              "&:hover": { backgroundColor: "#990000" },
              "&:disabled": { backgroundColor: "#4D0000", color: "#808080" },
              textTransform: "uppercase",
              fontWeight: "bold",
            }}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
      {/* Preview/Edit Modal */}
      <Modal
        open={selectedPart !== null}
        onClose={() => setSelectedPart(null)}
        aria-labelledby="modal-title"
      >
        <Box
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            backgroundColor: "#1F2937",
            padding: 4,
            borderRadius: "12px",
            width: 700,
            boxShadow: "0 8px 30px rgba(0, 0, 0, 0.8)",
            border: "1px solid rgba(255, 255, 255, 0.2)",
          }}
        >
          {isEditMode ? (
            <div className="space-y-4 flex flex-col gap-7">
              <h2 className="text-2xl font-bold text-white text-center">
                Edit Part
              </h2>
              <TextField
                label="Part Name"
                value={updatedPart.partName}
                onChange={(e) =>
                  setUpdatedPart({ ...updatedPart, partName: e.target.value })
                }
                fullWidth
                sx={textFieldStyle}
              />
              <TextField
                label="Part No"
                value={updatedPart.partNo}
                onChange={(e) =>
                  setUpdatedPart({ ...updatedPart, partNo: e.target.value })
                }
                fullWidth
                sx={textFieldStyle}
              />
              <TextField
                label="Quantity"
                value={updatedPart.quantity}
                onChange={(e) =>
                  setUpdatedPart({ ...updatedPart, quantity: e.target.value })
                }
                fullWidth
                sx={textFieldStyle}
              />
              <div className="flex justify-between space-x-2">
                <Button
                  onClick={() => setSelectedPart(null)}
                  variant="contained"
                  color="error"
                >
                  🚫 Cancel
                </Button>
                <Button
                  onClick={handleSaveEdit}
                  variant="contained"
                  color="primary"
                >
                  💾 Save
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-white">
              <h2 className="text-2xl font-bold text-center mb-4">
                Preview Part
              </h2>
              <div ref={printRef}>
                <PrintLabel
                  partNo={selectedPart?.partNo}
                  logoUrl={logoImage}
                  className="text-3xl"
                />
              </div>
              <div className="flex justify-between space-x-2 mt-4">
                <Button
                  onClick={() => setSelectedPart(null)}
                  variant="contained"
                  color="error"
                >
                  🚫 Close
                </Button>
                <Button
                  onClick={handlePrint}
                  variant="contained"
                  color="primary"
                >
                  🖨️ Print
                </Button>
              </div>
            </div>
          )}
        </Box>
      </Modal>
    </div>
  );
};

const textFieldStyle = {
  "& .MuiOutlinedInput-root": {
    "& fieldset": {
      borderColor: "rgba(255, 255, 255, 0.3)",
    },
    "&:hover fieldset": {
      borderColor: "rgba(255, 255, 255, 0.5)",
    },
  },
  "& .MuiInputLabel-root": {
    color: "rgba(255, 255, 255, 0.7)",
  },
  "& .MuiOutlinedInput-input": {
    color: "white",
  },
};

export default Table;
