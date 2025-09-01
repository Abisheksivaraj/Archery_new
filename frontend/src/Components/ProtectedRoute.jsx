// ProtectedRoute.jsx
import React from "react";
import { Navigate } from "react-router-dom";
import { Box, Typography, Paper, Button } from "@mui/material";
import LockIcon from "@mui/icons-material/Lock";
import HomeIcon from "@mui/icons-material/Home";
import { useNavigate } from "react-router-dom";

// No Access Component
const NoAccess = ({ requiredPermission }) => {
  const navigate = useNavigate();

  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "70vh",
        p: 3,
      }}
    >
      <Paper
        elevation={3}
        sx={{
          p: 4,
          textAlign: "center",
          maxWidth: 500,
          borderRadius: 3,
        }}
      >
        <Box
          sx={{
            backgroundColor: "#ff5722",
            borderRadius: "50%",
            width: 80,
            height: 80,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            mx: "auto",
            mb: 3,
          }}
        >
          <LockIcon sx={{ fontSize: 40, color: "white" }} />
        </Box>

        <Typography
          variant="h4"
          gutterBottom
          sx={{ fontWeight: "bold", color: "#d32f2f" }}
        >
          Access Denied
        </Typography>

        <Typography variant="body1" sx={{ mb: 2, color: "text.secondary" }}>
          You don't have permission to access this page.
        </Typography>

        {requiredPermission && (
          <Typography
            variant="body2"
            sx={{ mb: 3, color: "text.secondary", fontStyle: "italic" }}
          >
            Required permission: <strong>{requiredPermission}</strong>
          </Typography>
        )}

        <Button
          variant="contained"
          startIcon={<HomeIcon />}
          onClick={() => navigate("/dashboard")}
          sx={{
            mt: 2,
            backgroundColor: "#448ee4",
            "&:hover": {
              backgroundColor: "#357abd",
            },
          }}
        >
          Go to Dashboard
        </Button>
      </Paper>
    </Box>
  );
};

// Protected Route Component
const ProtectedRoute = ({
  children,
  requiredPermission,
  fallbackPath = "/dashboard",
  showNoAccess = true,
}) => {
  // Get user data and permissions
  const getPermissions = () => {
    try {
      const storedPermissions = localStorage.getItem("permissions");
      return storedPermissions ? JSON.parse(storedPermissions) : {};
    } catch (error) {
      console.warn("Failed to parse permissions from localStorage:", error);
      return {};
    }
  };

  const getRole = () => {
    try {
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        const parsedUser = JSON.parse(storedUser);
        return parsedUser.role || "";
      }
      return localStorage.getItem("role") || "";
    } catch (error) {
      console.warn("Failed to parse user role:", error);
      return "";
    }
  };

  const isAdmin = () => {
    const role = getRole();
    return role && role.toLowerCase() === "admin";
  };

  const hasPermission = (perm) => {
    if (isAdmin()) return true; // Admin has access to everything

    const permissions = getPermissions();
    const permissionMap = {
      manage_parts: "partMaster",
      view_dispatch: "dispatch",
      scan_invoice: "scanner",
      manage_users: "Admin",
    };

    const actualPermissionKey = permissionMap[perm];
    return (
      permissions &&
      typeof permissions === "object" &&
      permissions[actualPermissionKey] === true
    );
  };

  // Check if user has required permission
  if (requiredPermission && !hasPermission(requiredPermission)) {
    if (showNoAccess) {
      return <NoAccess requiredPermission={requiredPermission} />;
    } else {
      return <Navigate to={fallbackPath} replace />;
    }
  }

  return children;
};

export default ProtectedRoute;
export { NoAccess };
