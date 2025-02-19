import * as React from "react";
import { styled } from "@mui/material/styles";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell, { tableCellClasses } from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Paper from "@mui/material/Paper";
import { Box, Button, Tooltip, IconButton, Typography } from "@mui/material";
import ReplyIcon from "@mui/icons-material/Reply";
import { useNavigate } from "react-router-dom";
import { api } from "../apiConfig";
import { useEffect, useState } from "react";
import FirstPageIcon from "@mui/icons-material/FirstPage";
import LastPageIcon from "@mui/icons-material/LastPage";
import NavigateNextIcon from "@mui/icons-material/NavigateNext";
import NavigateBeforeIcon from "@mui/icons-material/NavigateBefore";

const StyledTableCell = styled(TableCell)(({ theme }) => ({
  [`&.${tableCellClasses.head}`]: {
    backgroundColor: "#7AD7F0",
    color: theme.palette.common.white,
    fontWeight: "bold",
  },
  [`&.${tableCellClasses.body}`]: {
    fontSize: 14,
  },
}));

const StyledTableRow = styled(TableRow)(({ theme }) => ({
  "&:nth-of-type(odd)": {
    backgroundColor: theme.palette.action.hover,
  },
  "&:last-child td, &:last-child th": {
    border: 0,
  },
}));

const PaginationButton = styled(IconButton)(({ theme }) => ({
  margin: "0 4px",
  color: "#666",
  backgroundColor: "#f5f5f5",
  borderRadius: "8px",
  padding: "8px",
  "&:hover": {
    backgroundColor: "#e0e0e0",
    color: "#333",
  },
  "&.active": {
    backgroundColor: "#7AD7F0",
    color: "white",
    "&:hover": {
      backgroundColor: "#5BC8E0",
    },
  },
  "&.disabled": {
    color: "#ccc",
    backgroundColor: "#f5f5f5",
    cursor: "not-allowed",
    "&:hover": {
      backgroundColor: "#f5f5f5",
    },
  },
}));

const PageNumber = styled(Button)(({ theme }) => ({
  minWidth: "40px",
  height: "40px",
  margin: "0 4px",
  borderRadius: "8px",
  color: "#666",
  "&.active": {
    backgroundColor: "#7AD7F0",
    color: "white",
    "&:hover": {
      backgroundColor: "#5BC8E0",
    },
  },
}));

export default function CustomizedTables() {
  const navigate = useNavigate();
  const [parts, setParts] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const partsPerPage = 5;

  useEffect(() => {
    const fetchParts = async () => {
      try {
        const response = await api.get("/getAllProduction");
        if (response.data.productions) {
          setParts(response.data.productions);
        } else if (response.data.data) {
          setParts(response.data.data);
        } else if (Array.isArray(response.data)) {
          setParts(response.data);
        } else {
          console.error("Unexpected data structure:", response.data);
          setParts([]);
        }
      } catch (error) {
        console.error("Error fetching parts:", error);
        setParts([]);
      }
    };
    fetchParts();
  }, []);

  const indexOfLastPart = currentPage * partsPerPage;
  const indexOfFirstPart = indexOfLastPart - partsPerPage;
  const currentParts = parts.slice(indexOfFirstPart, indexOfLastPart);
  const totalPages = Math.ceil(parts.length / partsPerPage);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const renderPageNumbers = () => {
    const pageNumbers = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(
        <PageNumber
          key={i}
          className={currentPage === i ? "active" : ""}
          onClick={() => handlePageChange(i)}
          variant="text"
        >
          {i}
        </PageNumber>
      );
    }
    return pageNumbers;
  };

  return (
    <Box>
      <Tooltip title="Go to User" placement="right">
        <Button
          onClick={() => navigate("/user")}
          sx={{
            mb: 2,
            background: "linear-gradient(145deg, #448ee4, #B7E9F7)",
            color: "#ffffff",
            fontWeight: "bold",
            textTransform: "uppercase",
            padding: "5px 2px",

            display: "flex",
            alignItems: "center",
            gap: "8px",
            boxShadow:
              "4px 4px 10px rgba(0, 0, 0, 0.5), -4px -4px 10px rgba(255, 255, 255, 0.1)",
            transition: "all 0.3s ease-in-out",

            "&:active": {
              boxShadow:
                "inset 2px 2px 5px rgba(0, 0, 0, 0.8), inset -2px -2px 5px rgba(255, 255, 255, 0.1)",
              transform: "translateY(2px)",
            },
          }}
        >
          <ReplyIcon />
        </Button>
      </Tooltip>
      <TableContainer component={Paper}>
        <Table sx={{ minWidth: 700 }} aria-label="customized table">
          <TableHead>
            <TableRow>
              <StyledTableCell align="center">Pkg.no</StyledTableCell>
              <StyledTableCell align="center">Part No</StyledTableCell>
              <StyledTableCell align="center">Part Name</StyledTableCell>
              <StyledTableCell align="center">
                Production Quantity
              </StyledTableCell>
              <StyledTableCell align="center">Scanned Quantity</StyledTableCell>
              <StyledTableCell align="center">Package Count</StyledTableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {currentParts.map((part) => (
              <StyledTableRow key={part.partNo}>
                <StyledTableCell align="center">{part.pkg_No}</StyledTableCell>
                <StyledTableCell align="center">{part.partNo}</StyledTableCell>
                <StyledTableCell align="center">
                  {part.partName}
                </StyledTableCell>
                <StyledTableCell align="center">
                  {part.productionQuantity}
                </StyledTableCell>
                <StyledTableCell align="center">
                  {part.scannedQuantity}
                </StyledTableCell>
                <StyledTableCell align="center">
                  {part.packageCount}
                </StyledTableCell>
              </StyledTableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          padding: "20px",
          gap: "8px",
        }}
      >
        <PaginationButton
          onClick={() => handlePageChange(1)}
          className={currentPage === 1 ? "disabled" : ""}
          disabled={currentPage === 1}
        >
          <FirstPageIcon />
        </PaginationButton>
        <PaginationButton
          onClick={() => handlePageChange(currentPage - 1)}
          className={currentPage === 1 ? "disabled" : ""}
          disabled={currentPage === 1}
        >
          <NavigateBeforeIcon />
        </PaginationButton>

        {renderPageNumbers()}

        <PaginationButton
          onClick={() => handlePageChange(currentPage + 1)}
          className={currentPage === totalPages ? "disabled" : ""}
          disabled={currentPage === totalPages}
        >
          <NavigateNextIcon />
        </PaginationButton>
        <PaginationButton
          onClick={() => handlePageChange(totalPages)}
          className={currentPage === totalPages ? "disabled" : ""}
          disabled={currentPage === totalPages}
        >
          <LastPageIcon />
        </PaginationButton>
      </Box>
    </Box>
  );
}
