import React from "react";
import { Navigate } from "react-router-dom";
import { Box, Typography, Paper } from "@mui/material";
import LockIcon from "@mui/icons-material/Lock";

const ProtectedRoute = ({
  children,
  requiredPermission,
  blockOperator = false,
}) => {
  const getPermissions = () => {
    try {
      const storedPermissions = localStorage.getItem("permissions");
      return storedPermissions ? JSON.parse(storedPermissions) : {};
    } catch (error) {
      console.warn("Failed to parse permissions:", error);
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

  const isOperator = () => {
    const role = getRole();
    return role && role.toLowerCase() === "operator";
  };

  const hasPermission = (perm) => {
    // Admin has all permissions
    if (isAdmin()) return true;

    // If this route blocks operators, deny access
    if (blockOperator && isOperator()) return false;

    // Operator has specific permissions
    if (isOperator()) {
      const operatorPermissions = ["scan_invoice", "view_dispatch"];
      return operatorPermissions.includes(perm);
    }

    // Regular permission check for other roles
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

  // Check if user is authenticated
  const isAuthenticated = () => {
    const token =
      localStorage.getItem("token") || localStorage.getItem("authToken");
    const user = localStorage.getItem("user");
    return !!(token && user);
  };

  // If not authenticated, redirect to login
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  // Check permissions
  if (!hasPermission(requiredPermission)) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "60vh",
          p: 3,
        }}
      >
        <Paper
          elevation={3}
          sx={{
            p: 4,
            textAlign: "center",
            maxWidth: 400,
            bgcolor: "#f5f5f5",
          }}
        >
          <LockIcon
            sx={{
              fontSize: 64,
              color: "error.main",
              mb: 2,
            }}
          />
          <Typography variant="h5" gutterBottom color="error">
            Access Denied
          </Typography>
          <Typography variant="body1" color="textSecondary">
            You don't have permission to access this page.
            {isOperator() && blockOperator && (
              <Box sx={{ mt: 1, fontStyle: "italic" }}>
                This feature is not available for operator role.
              </Box>
            )}
          </Typography>
        </Paper>
      </Box>
    );
  }

  return children;
};

export default ProtectedRoute;
