import React, { useState, useEffect } from "react";
import { styled } from "@mui/material/styles";
import Box from "@mui/material/Box";
import Drawer from "@mui/material/Drawer";
import CssBaseline from "@mui/material/CssBaseline";
import MuiAppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import List from "@mui/material/List";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Collapse from "@mui/material/Collapse";
import DashboardIcon from "@mui/icons-material/Dashboard";
import BuildIcon from "@mui/icons-material/Build";
import PersonIcon from "@mui/icons-material/Person";
import AddIcon from "@mui/icons-material/Add";
import TableChartIcon from "@mui/icons-material/TableChart";
import ExpandLess from "@mui/icons-material/ExpandLess";
import ExpandMore from "@mui/icons-material/ExpandMore";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import { useLocation, useNavigate, Routes, Route } from "react-router-dom";
import Tooltip from "@mui/material/Tooltip";
import logo from "../assets/logo.png";
import companyLogo from "../assets/companyLogo.png";
import Dashboard from "./Dashboard";
import PartMaster from "./PartMaster";
import PartTable from "./PartTable";
import User from "./dispatch";
import JobCard from "./JobCard";
import { toast } from "react-hot-toast";
import QrCodeScannerIcon from "@mui/icons-material/QrCodeScanner";
import { Button } from "@mui/material";
import ListAltIcon from "@mui/icons-material/ListAlt";
import PackageTable from "./PackageTable";
import LogoutIcon from "@mui/icons-material/Logout";
import { FaBoxOpen } from "react-icons/fa";
import PrinterConnection from "./Printer";
import DataTable from "./DataTable";
import Profile from "./Profile";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";

const drawerWidth = 240;
const primaryColor = "#448ee4";
const dropdownColor = "#B7E9F7";
const collapsedWidth = 64;

const Main = styled("main", { shouldForwardProp: (prop) => prop !== "open" })(
  ({ theme, open }) => ({
    flexGrow: 1,
    padding: theme.spacing(3),
    transition: theme.transitions.create("margin", {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.leavingScreen,
    }),
    marginLeft: 0,
    ...(open && {
      marginLeft: 0,
      transition: theme.transitions.create("margin", {
        easing: theme.transitions.easing.easeOut,
        duration: theme.transitions.duration.enteringScreen,
      }),
    }),
  })
);

const AppBar = styled(MuiAppBar, {
  shouldForwardProp: (prop) => prop !== "open",
})(({ theme, open }) => ({
  backgroundColor: "#39a3dd",
  color: "white",
  transition: theme.transitions.create(["margin", "width"], {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  marginLeft: collapsedWidth,
  width: `calc(100% - ${collapsedWidth}px)`,
  ...(open && {
    width: `calc(100% - ${drawerWidth}px)`,
    marginLeft: drawerWidth,
    transition: theme.transitions.create(["margin", "width"], {
      easing: theme.transitions.easing.easeOut,
      duration: theme.transitions.duration.enteringScreen,
    }),
  }),
}));

const DrawerHeader = styled("div")(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  padding: theme.spacing(1),
  justifyContent: "center",
  flexDirection: "column",
  minHeight: 64,
}));

function PersistentDrawerLeft() {
  const [open, setOpen] = useState(() => {
    const savedOpen = localStorage.getItem("drawerOpen");
    return savedOpen ? JSON.parse(savedOpen) : false;
  });

  const [dropdownOpen, setDropdownOpen] = useState(() => {
    const savedDropdown = localStorage.getItem("dropdownOpen");
    return savedDropdown ? JSON.parse(savedDropdown) : false;
  });

  const [selectedMenu, setSelectedMenu] = useState(() => {
    return localStorage.getItem("selectedMenu") || "";
  });

  const [permissions, setPermissions] = useState({});
  const [role, setRole] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  const [activePath, setActivePath] = useState("/");

  // Load permissions + role
  useEffect(() => {
    try {
      const storedPermissions = localStorage.getItem("permissions");
      if (storedPermissions) {
        setPermissions(JSON.parse(storedPermissions) || {});
      } else {
        setPermissions({});
      }

      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        const parsedUser = JSON.parse(storedUser);
        setRole(parsedUser.role || "");
        console.log("User role loaded:", parsedUser.role);
      } else {
        setRole(localStorage.getItem("role") || "");
      }
    } catch (error) {
      console.warn("Failed to parse from localStorage:", error);
      setPermissions({});
      setRole("");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ✅ Cleaner isAdmin function
  const isAdmin = () => {
    return role && role.toLowerCase() === "admin";
  };

  // ✅ Permission check
  const hasPermission = (perm) => {
    if (isAdmin()) return true; // Admin sees all

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

  useEffect(() => {
    setActivePath(location.pathname);
    if (location.pathname.includes("/part")) {
      setDropdownOpen(true);
      localStorage.setItem("dropdownOpen", JSON.stringify(true));
    }

    const pathToMenuMap = {
      "/": "📊 Dashboard",
      "/dashboard": "📊 Dashboard",
      "/part": "🛠️ Part Master > Add",
      "/part_Table": "🛠️ Part Master > Table",
      "/Card": "📱 Invoice Scanning",
      "/dispatch": "📦 Dispatch",
      "/user": "👤 User Master",
      "/profile": "👤 User Profile", // Add this line
    };

    const currentMenu = pathToMenuMap[location.pathname];
    if (currentMenu) {
      setSelectedMenu(currentMenu);
      localStorage.setItem("selectedMenu", currentMenu);
    }
  }, [location]);

  useEffect(() => {
    localStorage.setItem("drawerOpen", JSON.stringify(open));
  }, [open]);

  useEffect(() => {
    localStorage.setItem("dropdownOpen", JSON.stringify(dropdownOpen));
  }, [dropdownOpen]);

  const handleDrawerOpen = () => setOpen(true);
  const handleDrawerClose = () => setOpen(false);

  const handlePartMasterClick = () => {
    if (!open) {
      setOpen(true);
      setTimeout(() => {
        setDropdownOpen(true);
      }, 200);
    } else {
      setDropdownOpen(!dropdownOpen);
    }
  };

  const handleMenuClick = (menu, submenu, path) => {
    const newSelectedMenu = `${menu}${submenu ? ` > ${submenu}` : ""}`;
    setSelectedMenu(newSelectedMenu);
    localStorage.setItem("selectedMenu", newSelectedMenu);
    if (!submenu) {
      setOpen(false);
    }
    navigate(path);
  };

  const isActive = (path) => activePath === path;
  const isPartMasterActive = () => activePath.includes("/part");

  const getMenuItemStyle = (isSelected) => ({
    "&.Mui-selected": {
      bgcolor: `${primaryColor}15`,
      "&:hover": { bgcolor: `${primaryColor}25` },
      "& .MuiListItemIcon-root": { color: primaryColor },
      "& .MuiListItemText-primary": { color: primaryColor, fontWeight: "bold" },
    },
    ...(isSelected && {
      bgcolor: `${primaryColor}15`,
      "&:hover": { bgcolor: `${primaryColor}25` },
      "& .MuiListItemIcon-root": { color: primaryColor },
      "& .MuiListItemText-primary": { color: primaryColor, fontWeight: "bold" },
    }),
    "&:hover": {
      bgcolor: `${primaryColor}10`,
      "& .MuiListItemIcon-root": { color: primaryColor },
    },
  });

  const getDropdownStyle = (isSelected) => ({
    pl: 4,
    "&.Mui-selected": {
      bgcolor: `${dropdownColor}15`,
      "&:hover": { bgcolor: `${dropdownColor}25` },
      "& .MuiListItemIcon-root": { color: dropdownColor },
      "& .MuiListItemText-primary": {
        color: dropdownColor,
        fontWeight: "bold",
      },
    },
    ...(isSelected && {
      bgcolor: `${dropdownColor}15`,
      "&:hover": { bgcolor: `${dropdownColor}25` },
      "& .MuiListItemIcon-root": { color: dropdownColor },
      "& .MuiListItemText-primary": {
        color: dropdownColor,
        fontWeight: "bold",
      },
    }),
    "&:hover": {
      bgcolor: `${dropdownColor}10`,
      "& .MuiListItemIcon-root": { color: dropdownColor },
    },
  });

  const ListItemWithTooltip = ({ tooltip, children }) => {
    return !open ? (
      <Tooltip title={tooltip} placement="right">
        {children}
      </Tooltip>
    ) : (
      children
    );
  };

  const handleTableListClick = () => navigate("/table_List");
  const handleDataTableClick = () => navigate("/Data_Table");

  const isUserRoute = location.pathname.toLowerCase() === "/dispatch";
  const isInvoiceScanningRoute = location.pathname.toLowerCase() === "/card";

  const handleLogout = () => {
    toast.success("Logged Out Successfully");
    localStorage.clear();
    navigate("/", { state: { showToast: true } });
  };

  // Don't render menu items until permissions are loaded
  if (isLoading) {
    return (
      <Box
        sx={{
          display: "flex",
          height: "100vh",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        Loading...
      </Box>
    );
  }

  return (
    <Box sx={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      <CssBaseline />
      <AppBar position="fixed" open={open}>
        <Toolbar
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            pr: 2,
          }}
        >
          <span
            style={{ fontSize: "18px", fontWeight: "bold", color: "white" }}
          >
            {selectedMenu}
          </span>

          {isUserRoute && (
            <Button
              variant="contained"
              color="primary"
              startIcon={<ListAltIcon />}
              onClick={handleTableListClick}
              sx={{
                backgroundColor: "rgba(255, 255, 255, 0.1)",
                "&:hover": { backgroundColor: "rgba(255, 255, 255, 0.2)" },
                textTransform: "none",
              }}
            >
              Table List
            </Button>
          )}

          {isInvoiceScanningRoute && (
            <Button
              variant="contained"
              color="primary"
              startIcon={<TableChartIcon />}
              onClick={handleDataTableClick}
              sx={{
                backgroundColor: "rgba(255, 255, 255, 0.1)",
                "&:hover": { backgroundColor: "rgba(255, 255, 255, 0.2)" },
                textTransform: "none",
              }}
            >
              Data Table
            </Button>
          )}
        </Toolbar>
      </AppBar>

      <Drawer
        variant="permanent"
        sx={{
          width: open ? drawerWidth : collapsedWidth,
          flexShrink: 0,
          "& .MuiDrawer-paper": {
            width: open ? drawerWidth : collapsedWidth,
            boxSizing: "border-box",
            backgroundColor: "white",
            overflowX: "hidden",
            transition: (theme) =>
              theme.transitions.create("width", {
                easing: theme.transitions.easing.sharp,
                duration: theme.transitions.duration.enteringScreen,
              }),
          },
        }}
      >
        <DrawerHeader>
          <Box
            sx={{
              width: "100%",
              display: "flex",
              justifyContent: "center",
              transition: "all 0.2s",
            }}
          >
            <img
              src={open ? companyLogo : logo}
              alt="Company Logo"
              style={{ maxWidth: open ? "200px" : "40px", height: "auto" }}
            />
          </Box>
        </DrawerHeader>
        <Divider />

        <List>
          {/* Dashboard (everyone can access) */}
          <ListItemWithTooltip tooltip="Dashboard">
            <ListItem disablePadding>
              <ListItemButton
                selected={isActive("/dashboard")}
                onClick={() =>
                  handleMenuClick("📊 Dashboard", null, "/dashboard")
                }
                sx={getMenuItemStyle(isActive("/dashboard"))}
              >
                <ListItemIcon>
                  <DashboardIcon />
                </ListItemIcon>
                {open && <ListItemText primary="Dashboard" />}
              </ListItemButton>
            </ListItem>
          </ListItemWithTooltip>

          {/* Part Master - Show for Admin OR users with manage_parts permission */}
          {(isAdmin() || hasPermission("manage_parts")) && (
            <ListItemWithTooltip tooltip="Part Master">
              <ListItem disablePadding>
                <ListItemButton
                  selected={isPartMasterActive()}
                  onClick={handlePartMasterClick}
                  sx={getMenuItemStyle(isPartMasterActive())}
                >
                  <ListItemIcon>
                    <BuildIcon />
                  </ListItemIcon>
                  {open && (
                    <>
                      <ListItemText primary="Part Master" />
                      {dropdownOpen ? <ExpandLess /> : <ExpandMore />}
                    </>
                  )}
                </ListItemButton>
              </ListItem>
            </ListItemWithTooltip>
          )}

          {/* Dropdown - Add / Table - Show for Admin OR users with manage_parts permission */}
          {(isAdmin() || hasPermission("manage_parts")) && (
            <Collapse in={open && dropdownOpen} timeout="auto" unmountOnExit>
              <List component="div" disablePadding>
                <ListItemWithTooltip tooltip="Add Part">
                  <ListItem disablePadding>
                    <ListItemButton
                      selected={isActive("/part")}
                      sx={getDropdownStyle(isActive("/part"))}
                      onClick={() =>
                        handleMenuClick("🛠️ Part Master", "✙ Add", "/part")
                      }
                    >
                      <ListItemIcon>
                        <AddIcon />
                      </ListItemIcon>
                      {open && <ListItemText primary="Add" />}
                    </ListItemButton>
                  </ListItem>
                </ListItemWithTooltip>

                <ListItemWithTooltip tooltip="Part Table">
                  <ListItem disablePadding>
                    <ListItemButton
                      selected={isActive("/part_Table")}
                      sx={getDropdownStyle(isActive("/part_Table"))}
                      onClick={() =>
                        handleMenuClick(
                          "🛠️ Part Master",
                          "Table",
                          "/part_Table"
                        )
                      }
                    >
                      <ListItemIcon>
                        <TableChartIcon />
                      </ListItemIcon>
                      {open && <ListItemText primary="Table" />}
                    </ListItemButton>
                  </ListItem>
                </ListItemWithTooltip>
              </List>
            </Collapse>
          )}

          {/* Invoice Scanning - Show for Admin OR users with scan_invoice permission */}
          {(isAdmin() || hasPermission("scan_invoice")) && (
            <ListItemWithTooltip tooltip="Invoice Scanning">
              <ListItem disablePadding>
                <ListItemButton
                  selected={isActive("/Card")}
                  onClick={() =>
                    handleMenuClick("📱 Invoice Scanning", null, "/Card")
                  }
                  sx={getMenuItemStyle(isActive("/Card"))}
                >
                  <ListItemIcon>
                    <QrCodeScannerIcon />
                  </ListItemIcon>
                  {open && <ListItemText primary="Invoice Scanning" />}
                </ListItemButton>
              </ListItem>
            </ListItemWithTooltip>
          )}

          {/* Dispatch - Show for Admin OR users with view_dispatch permission */}
          {(isAdmin() || hasPermission("view_dispatch")) && (
            <ListItemWithTooltip tooltip="Dispatch">
              <ListItem disablePadding>
                <ListItemButton
                  selected={isActive("/dispatch")}
                  onClick={() =>
                    handleMenuClick("📦 Dispatch", null, "/dispatch")
                  }
                  sx={getMenuItemStyle(isActive("/dispatch"))}
                >
                  <ListItemIcon>
                    <FaBoxOpen className="h-[2rem] w-[2rem]" />
                  </ListItemIcon>
                  {open && <ListItemText primary="Dispatch" />}
                </ListItemButton>
              </ListItem>
            </ListItemWithTooltip>
          )}

          {/* User Master - Show for Admin OR users with manage_users permission */}
          {(isAdmin() || hasPermission("manage_users")) && (
            <ListItemWithTooltip tooltip="User Master">
              <ListItem disablePadding>
                <ListItemButton
                  selected={isActive("/user")}
                  onClick={() =>
                    handleMenuClick("👤 User Master", null, "/user")
                  }
                  sx={getMenuItemStyle(isActive("/user"))}
                >
                  <ListItemIcon>
                    <PersonIcon />
                  </ListItemIcon>
                  {open && <ListItemText primary="User Master" />}
                </ListItemButton>
              </ListItem>
            </ListItemWithTooltip>
          )}
        </List>

        <Divider />

        {/* Expand / Collapse */}
        <Box
          sx={{
            marginTop: "auto",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            padding: 1,
          }}
        >
          <Tooltip title={open ? "Collapse" : "Expand"}>
            <IconButton onClick={open ? handleDrawerClose : handleDrawerOpen}>
              {open ? <ChevronLeftIcon /> : <ChevronRightIcon />}
            </IconButton>
          </Tooltip>
        </Box>

        <Divider sx={{ marginY: 1 }} />

        {/* User Profile Button */}
        <ListItemWithTooltip tooltip="User Profile">
          <ListItem disablePadding>
            <ListItemButton
              selected={isActive("/profile")}
              onClick={() =>
                handleMenuClick("👤 User Profile", null, "/profile")
              }
              sx={getMenuItemStyle(isActive("/profile"))}
            >
              <ListItemIcon>
                <AccountCircleIcon />
              </ListItemIcon>
              {open && <ListItemText primary="Profile" />}
            </ListItemButton>
          </ListItem>
        </ListItemWithTooltip>

        <Divider sx={{ marginY: 1 }} />

        {/* Logout */}
        <ListItemWithTooltip tooltip="Logout">
          <ListItem disablePadding>
            <ListItemButton
              onClick={handleLogout}
              sx={{
                color: "#448ee4",
                "&:hover": {
                  bgcolor: "#448ee410",
                  "& .MuiListItemIcon-root": { color: "#448ee4" },
                  "& .MuiListItemText-primary": { color: "#448ee4" },
                },
              }}
            >
              <ListItemIcon>
                <LogoutIcon />
              </ListItemIcon>
              {open && <ListItemText primary="Logout" />}
            </ListItemButton>
          </ListItem>
        </ListItemWithTooltip>
      </Drawer>

      <Main open={open}>
        <DrawerHeader />
        <Routes>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/part" element={<PartMaster />} />
          <Route path="/part_Table" element={<PartTable />} />
          <Route path="/dispatch" element={<User />} />
          <Route path="/table_List" element={<PackageTable />} />
          <Route path="/Data_Table" element={<DataTable />} />
          <Route path="/user" element={<PrinterConnection />} />
          <Route path="/Card" element={<JobCard />} />
          <Route path="/profile" element={<Profile />} />
        </Routes>
      </Main>
    </Box>
  );
}

export default PersistentDrawerLeft;
