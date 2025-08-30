import React, { useState, useEffect } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Divider,
  IconButton,
} from "@mui/material";
import { useNavigate } from "react-router-dom";

const Profile = () => {
  const navigate = useNavigate();
  const [userInfo, setUserInfo] = useState({});
  const [permissions, setPermissions] = useState({});
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    // Load user info from localStorage
    try {
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        const parsedUser = JSON.parse(storedUser);
        setUserInfo(parsedUser);

        // Check if user is admin
        const role = parsedUser.role?.toLowerCase();
        setIsAdmin(role === "admin");
      }

      const storedPermissions = localStorage.getItem("permissions");
      if (storedPermissions) {
        setPermissions(JSON.parse(storedPermissions));
      }
    } catch (error) {
      console.error("Failed to load user info:", error);
    }
  }, []);

  const ProfileRow = ({ label, value }) => (
    <Box
      sx={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        py: 1.5,
        px: 2,
        "&:hover": {
          bgcolor: "#f5f5f5",
        },
      }}
    >
      <Typography variant="body1" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body1" color="text.primary" sx={{ fontWeight: 500 }}>
        {value || "Not provided"}
      </Typography>
    </Box>
  );

  const PermissionChip = ({ permission, granted }) => (
    <Box
      sx={{
        display: "inline-block",
        px: 1.5,
        py: 0.5,
        mr: 1,
        mb: 1,
        borderRadius: "16px",
        bgcolor: granted ? "#e8f5e8" : "#f5f5f5",
        color: granted ? "#2e7d32" : "#666",
        fontSize: "0.875rem",
        fontWeight: granted ? "bold" : "normal",
      }}
    >
      {permission}
    </Box>
  );

  const formatPermissionKey = (key) => {
    return key
      .replace(/([A-Z])/g, " $1")
      .replace(/^./, (str) => str.toUpperCase())
      .trim();
  };

  return (
    <Box
      sx={{
        maxWidth: 600,
        mx: "auto",
        p: 2,
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        position: "relative",
      }}
    >
      {/* Close Button */}
      <Box
        onClick={() => navigate("/part")}
        sx={{
          position: "absolute",
          top: 16,
          right: 16,
          zIndex: 1000,
          width: 32,
          height: 32,
          borderRadius: "50%",
          bgcolor: "white",
          boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          fontSize: "18px",
          fontWeight: "bold",
          color: "#666",
          "&:hover": {
            bgcolor: "#f5f5f5",
            color: "#333",
          },
        }}
      >
        ×
      </Box>

      {/* Profile Card */}
      <Card
        sx={{
          borderRadius: 3,
          boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
          border: "1px solid #e0e0e0",
        }}
      >
        <CardContent sx={{ p: 0 }}>
          {/* Header */}
          <Box
            sx={{
              p: 3,
              textAlign: "center",
              borderBottom: "1px solid #e0e0e0",
            }}
          >
            <Typography
              variant="h5"
              sx={{
                fontWeight: 600,
                color: "#1976d2",
                mb: 0.5,
              }}
            >
              {isAdmin
                ? userInfo.username || "Admin User"
                : userInfo.empName || userInfo.username || "User"}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {/* {isAdmin ? userInfo.email : `${userInfo.empId || "EMP001"}`} */}
            </Typography>
          </Box>

          {/* Profile Information */}
          <Box>
            {isAdmin ? (
              // Admin Information
              <>
                <ProfileRow label="Email ID" value={userInfo.email} />
                <Divider />
                <ProfileRow label="Username" value={userInfo.username} />
                <Divider />
                <ProfileRow label="Role" value={userInfo.role} />
                <Divider />
                <ProfileRow label="Account Type" value="Administrator" />
              </>
            ) : (
              // Employee Information
              <>
                <ProfileRow
                  label="Employee ID"
                  value={userInfo.empId || userInfo.employeeId}
                />
                <Divider />
                <ProfileRow
                  label="Employee Name"
                  value={
                    userInfo.empName || userInfo.employeeName || userInfo.name
                  }
                />
                <Divider />
                <ProfileRow label="Role" value={userInfo.role} />
                <Divider />
                <ProfileRow
                  label="Status"
                  value={
                    <Box
                      sx={{
                        px: 1.5,
                        py: 0.5,
                        borderRadius: "16px",
                        bgcolor:
                          userInfo.status?.toLowerCase() === "active"
                            ? "#e8f5e8"
                            : "#f5f5f5",
                        color:
                          userInfo.status?.toLowerCase() === "active"
                            ? "#2e7d32"
                            : "#666",
                        fontSize: "0.875rem",
                        fontWeight: "bold",
                        display: "inline-block",
                      }}
                    >
                      {userInfo.status || "Unknown"}
                    </Box>
                  }
                />
                <Divider />
                <ProfileRow label="Email" value={userInfo.email} />
              </>
            )}
          </Box>
        </CardContent>
      </Card>

      {/* Permissions Card - Only show for non-admin users */}
      {!isAdmin && (
        <Card
          sx={{
            mt: 2,
            borderRadius: 3,
            boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
            border: "1px solid #e0e0e0",
          }}
        >
          <CardContent>
            <Typography
              variant="h6"
              sx={{
                mb: 2,
                color: "#1976d2",
                fontWeight: 600,
              }}
            >
              Permissions & Access
            </Typography>

            {Object.keys(permissions).length === 0 ? (
              <Typography
                color="text.secondary"
                sx={{
                  fontStyle: "italic",
                  textAlign: "center",
                  py: 2,
                }}
              >
                No permissions assigned
              </Typography>
            ) : (
              <Box>
                {Object.entries(permissions).map(([key, value]) => (
                  <PermissionChip
                    key={key}
                    permission={formatPermissionKey(key)}
                    granted={value}
                  />
                ))}
              </Box>
            )}
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default Profile;
