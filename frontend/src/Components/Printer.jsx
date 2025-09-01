import React, { useState, useEffect } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Grid,
  TextField,
  Switch,
  FormControlLabel,
  InputAdornment,
  Paper,
  Chip,
  Stack,
  useMediaQuery,
  Alert,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import {
  Search as SearchIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Save as SaveIcon,
  Visibility,
  VisibilityOff,
  Close,
} from "@mui/icons-material";
import { useTheme } from "@mui/material/styles";
import { api } from "../apiConfig";
import { toast } from "react-hot-toast";

const modules = [
  { key: "partMaster", label: "Part Master" },
  { key: "dispatch", label: "Dispatch" },
  { key: "scanner", label: "Invoice Scanning" },
  { key: "admin", label: "Admin" }, // Changed from "Admin" to "admin" for consistency
];

export default function UserMaster() {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("md"));
  const [users, setUsers] = useState([]);
  const [editingUser, setEditingUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setDialogOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    empId: "",
    empName: "",
    email: "",
    password: "",
    role: "",
    status: "Active",
    userRights: {
      partMaster: false,
      dispatch: false,
      scanner: false,
      admin: false, // Changed from "Admin" to "admin"
    },
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Fetch Users
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await api.get("/users");
      if (response.data.success) {
        setUsers(
          response.data.users.map((user) => ({
            ...user,
            id: user._id,
          }))
        );
      }
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Failed to fetch users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Filtering Users
  const filteredUsers = users.filter(
    (u) =>
      u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.employeeId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.role?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Form Validation
  const validate = () => {
    const next = {};
    if (!formData.empName.trim()) next.empName = "Name is required";
    if (!formData.email.trim()) next.email = "Email is required";
    if (!formData.email.includes("@")) next.email = "Valid email required";
    if (!formData.role.trim()) next.role = "Role is required";
    if (!editingUser && (!formData.password || formData.password.length < 6)) {
      next.password = "Password must be at least 6 characters";
    }
    if (editingUser && formData.password && formData.password.length < 6) {
      next.password = "Password must be at least 6 characters";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  // Generates 'EMP00001', 'EMP00002', etc. based on highest employeeId used
  const generateEmpId = () => {
    const existingIds = users
      .map((u) => u.employeeId)
      .filter(Boolean)
      .map((id) => Number(id.replace(/\D/g, "")))
      .filter((num) => !isNaN(num));
    const maxId = existingIds.length > 0 ? Math.max(...existingIds) : 0;
    return `EMP${String(maxId + 1).padStart(5, "0")}`;
  };

  // Dialog Open for New/Edit
  const handleOpenDialog = (user) => {
    if (user) {
      // Editing existing user
      setEditingUser(user);
      setFormData({
        empId: user.employeeId || "",
        empName: user.name || "",
        email: user.email || "",
        password: "", // Always empty for edit (optional update)
        role: user.role || "",
        status: user.status || "Active",
        userRights: {
          partMaster: Boolean(user.permissions?.partMaster),
          dispatch: Boolean(user.permissions?.dispatch),
          scanner: Boolean(user.permissions?.scanner),
          admin: Boolean(user.permissions?.admin), // Fixed: now reading from admin field
        },
      });
    } else {
      // Creating new user
      setEditingUser(null);
      setFormData({
        empId: generateEmpId(),
        empName: "",
        email: "",
        password: "",
        role: "",
        status: "Active",
        userRights: {
          partMaster: false,
          dispatch: false,
          scanner: false,
          admin: false,
        },
      });
    }
    setErrors({});
    setDialogOpen(true);
  };

  // Handle CRUD
  const handleSave = async () => {
    if (!validate()) return;

    try {
      setSaving(true);

      // Prepare payload with consistent permission mapping
      const payload = {
        name: formData.empName.trim(),
        email: formData.email.trim(),
        employeeId: formData.empId,
        role: formData.role.trim(),
        status: formData.status,
        permissions: {
          partMaster: Boolean(formData.userRights.partMaster),
          dispatch: Boolean(formData.userRights.dispatch),
          scanner: Boolean(formData.userRights.scanner),
          admin: Boolean(formData.userRights.admin), // Consistent with backend
        },
      };

      // Only include password if it's provided
      if (formData.password.trim()) {
        payload.password = formData.password.trim();
      }

      let response;
      if (editingUser) {
        // Edit existing user
        response = await api.put(`/users/${editingUser._id}`, payload);
        toast.success("User updated successfully!");
      } else {
        // Create new user - password is required for new users
        if (!formData.password.trim()) {
          setErrors({ password: "Password is required for new users" });
          return;
        }
        payload.password = formData.password.trim();
        response = await api.post("/create", payload);
        toast.success("User created successfully!");
      }

      setDialogOpen(false);
      fetchUsers();
    } catch (error) {
      console.error("Save error:", error);
      const errorMessage = error.response?.data?.message || "Operation failed";
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this user?")) {
      return;
    }

    try {
      await api.delete(`/users/${id}`);
      toast.success("User deleted successfully!");
      fetchUsers();
    } catch (error) {
      console.error("Delete error:", error);
      const errorMessage =
        error.response?.data?.message || "Failed to delete user";
      toast.error(errorMessage);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    // Clear error for this field when user starts typing
    if (errors[e.target.name]) {
      setErrors({ ...errors, [e.target.name]: "" });
    }
  };

  // Handle permission toggle changes
  const handlePermissionChange = (permissionKey, checked) => {
    setFormData((prev) => ({
      ...prev,
      userRights: {
        ...prev.userRights,
        [permissionKey]: checked,
      },
    }));
  };

  // Columns for DataGrid
  const columns = [
    { field: "employeeId", headerName: "Emp ID", width: 110 },
    { field: "name", headerName: "Name", flex: 1, minWidth: 150 },
    { field: "email", headerName: "Email", flex: 1, minWidth: 200 },
    { field: "role", headerName: "Role", width: 120 },
    {
      field: "status",
      headerName: "Status",
      width: 100,
      renderCell: (params) => (
        <Chip
          label={params.value}
          color={params.value === "Active" ? "success" : "default"}
          size="small"
        />
      ),
    },
    {
      field: "permissions",
      headerName: "Permissions",
      width: 150,
      renderCell: (params) => {
        const perms = params.row.permissions || {};
        const activePerms = Object.entries(perms).filter(
          ([key, value]) => value
        );
        return (
          <Stack direction="row" spacing={0.5} flexWrap="wrap">
            {activePerms.length > 0 ? (
              activePerms.map(([key, value]) => (
                <Chip
                  key={key}
                  label={key}
                  size="small"
                  variant="outlined"
                  sx={{ fontSize: "0.7rem", height: "20px" }}
                />
              ))
            ) : (
              <Typography variant="body2" color="text.secondary">
                No permissions
              </Typography>
            )}
          </Stack>
        );
      },
    },
    {
      field: "actions",
      headerName: "Actions",
      width: 130,
      renderCell: (params) => (
        <Stack direction="row" spacing={1}>
          <IconButton
            size="small"
            color="primary"
            onClick={() => handleOpenDialog(params.row)}
          >
            <EditIcon />
          </IconButton>
          <IconButton
            size="small"
            color="error"
            onClick={() => handleDelete(params.row._id)}
          >
            <DeleteIcon />
          </IconButton>
        </Stack>
      ),
      sortable: false,
      filterable: false,
    },
  ];

  return (
    <Box
      sx={{
        bgcolor: "background.default",
        minHeight: "100vh",
        py: { xs: 2, sm: 1 },
      }}
    >
      {/* Header */}
      <AppBar position="sticky" color="default" elevation={1}>
        <Toolbar>
          <Typography variant="h4" fontWeight={700} sx={{ flexGrow: 1 }}>
            User Management
          </Typography>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog(null)}
          >
            Add User
          </Button>
        </Toolbar>
      </AppBar>

      {/* Search and stats */}
      <Box sx={{ maxWidth: 1200, mx: "auto", mb: 3, px: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              variant="outlined"
              placeholder="Search users by name, email, employee ID, or role..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon color="action" />
                  </InputAdornment>
                ),
              }}
              sx={{ bgcolor: "background.paper", borderRadius: 2 }}
            />
          </Grid>
          <Grid item xs={6} md={3}>
            <Paper sx={{ p: 2, textAlign: "center" }} elevation={1}>
              <Typography variant="subtitle2" color="text.secondary">
                Total Users
              </Typography>
              <Typography variant="h5" color="primary">
                {users.length}
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={6} md={3}>
            <Paper sx={{ p: 2, textAlign: "center" }} elevation={1}>
              <Typography variant="subtitle2" color="text.secondary">
                Active Users
              </Typography>
              <Typography variant="h5" color="success.main">
                {users.filter((u) => u.status === "Active").length}
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      </Box>

      {/* Users Table */}
      <Box
        sx={{
          width: "100%",
          maxWidth: 1200,
          mx: "auto",
          px: 2,
          bgcolor: "background.paper",
          borderRadius: 2,
          boxShadow: 2,
          overflow: "hidden",
        }}
      >
        <DataGrid
          rows={filteredUsers}
          columns={columns}
          pageSize={10}
          rowsPerPageOptions={[5, 10, 25]}
          autoHeight
          loading={loading}
          getRowId={(r) => r._id || r.id || Math.random()}
          disableSelectionOnClick
          sx={{
            border: 0,
            "& .MuiDataGrid-cell:focus": {
              outline: "none",
            },
            "& .MuiDataGrid-row:hover": {
              backgroundColor: "action.hover",
            },
          }}
        />
      </Box>

      {/* User dialog */}
      <Dialog
        open={isDialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="md"
        fullWidth
        fullScreen={fullScreen}
      >
        <DialogTitle>
          <Typography variant="h6" component="div">
            {editingUser ? "Edit User" : "Add New User"}
          </Typography>
          <IconButton
            sx={{ position: "absolute", right: 12, top: 12 }}
            onClick={() => setDialogOpen(false)}
          >
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {editingUser && (
            <Alert severity="info" sx={{ mb: 2 }}>
              Leave password field empty to keep current password
            </Alert>
          )}
          <Grid container spacing={3} sx={{ pt: 2 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Employee ID"
                name="empId"
                value={formData.empId}
                variant="outlined"
                InputProps={{ readOnly: true }}
                helperText="Auto-generated employee ID"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="User Name *"
                name="empName"
                value={formData.empName}
                onChange={handleChange}
                error={!!errors.empName}
                helperText={errors.empName}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Email *"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                error={!!errors.email}
                helperText={errors.email}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label={editingUser ? "New Password (optional)" : "Password *"}
                name="password"
                type={showPassword ? "text" : "password"}
                value={formData.password}
                onChange={handleChange}
                error={!!errors.password}
                helperText={errors.password}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setShowPassword((p) => !p)}>
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Role *"
                name="role"
                value={formData.role}
                onChange={handleChange}
                error={!!errors.role}
                helperText={errors.role}
                placeholder="e.g., Manager, Employee, Supervisor"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.status === "Active"}
                    onChange={(e) =>
                      setFormData((f) => ({
                        ...f,
                        status: e.target.checked ? "Active" : "Inactive",
                      }))
                    }
                    color="success"
                  />
                }
                label="Active Status"
              />
            </Grid>
            <Grid item xs={12}>
              <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
                User Permissions
              </Typography>
              <Paper sx={{ p: 2 }} variant="outlined">
                <Grid container spacing={2}>
                  {modules.map((mod) => (
                    <Grid item xs={12} sm={6} md={3} key={mod.key}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={Boolean(formData.userRights[mod.key])}
                            onChange={(e) =>
                              handlePermissionChange(mod.key, e.target.checked)
                            }
                            color="primary"
                          />
                        }
                        label={mod.label}
                        sx={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          textAlign: "center",
                          border: "1px solid",
                          borderColor: "divider",
                          borderRadius: 1,
                          p: 1,
                          m: 0,
                          width: "100%",
                          backgroundColor: formData.userRights[mod.key]
                            ? "primary.50"
                            : "transparent",
                        }}
                      />
                    </Grid>
                  ))}
                </Grid>
              </Paper>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDialogOpen(false)} disabled={saving}>
            Cancel
          </Button>
          <Button
            startIcon={<SaveIcon />}
            variant="contained"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Saving..." : editingUser ? "Update User" : "Create User"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
