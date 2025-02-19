import * as React from "react";
import { styled } from "@mui/material/styles";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell, { tableCellClasses } from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Paper from "@mui/material/Paper";
import { Box, Button, Tooltip, Pagination } from "@mui/material";
import ReplyIcon from "@mui/icons-material/Reply";
import { useNavigate } from "react-router-dom";
import { api } from "../apiConfig";
import { useEffect, useState } from "react";

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

export default function CustomizedTables() {
  const navigate = useNavigate();
  const [parts, setParts] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const partsPerPage = 5;

  useEffect(() => {
    const fetchParts = async () => {
      try {
        const response = await api.get("/getAllProduction");

        console.log("API response:", response.data);

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

  const handleChangePage = (event, newPage) => {
    setCurrentPage(newPage);
  };

  return (
    <Box>
      <Tooltip title="Go to User" placement="right">
        <Button
          onClick={() => navigate("/user")}
          sx={{
            mb: 2,
            background: "linear-gradient(145deg, #2C3E50, #1F2A38)",
            color: "#ffffff",
            fontWeight: "bold",
            textTransform: "uppercase",
            padding: "5px 2px",
            borderRadius: "6px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            boxShadow:
              "4px 4px 10px rgba(0, 0, 0, 0.5), -4px -4px 10px rgba(255, 255, 255, 0.1)",
            transition: "all 0.3s ease-in-out",
            border: "2px solid #1B2733",
            "&:hover": {
              background: "linear-gradient(145deg, #1F2A38, #2C3E50)",
              boxShadow:
                "6px 6px 12px rgba(0, 0, 0, 0.7), -4px -4px 10px rgba(255, 255, 255, 0.2)",
              transform: "translateY(-3px)",
            },
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
            {currentParts.map((part, index) => (
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
      <Box display="flex" justifyContent="center" mt={2}>
        <Pagination
          count={totalPages}
          page={currentPage}
          onChange={handleChangePage}
          color="primary"
          shape="rounded"
        />
      </Box>
    </Box>
  );
}
