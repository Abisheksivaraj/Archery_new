import React, { useState, useEffect } from "react";
import { styled, useTheme } from "@mui/material/styles";
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
import MenuIcon from "@mui/icons-material/Menu";
import { useLocation, useNavigate, Routes, Route } from "react-router-dom";
import Tooltip from "@mui/material/Tooltip";
import useMediaQuery from "@mui/material/useMediaQuery";
import logo from "../assets/logo.png";
import companyLogo from "../assets/companyLogo.png";
import Dashboard from "./Dashboard";
import PartMaster from "./PartMaster";
import PartTable from "./PartTable";
import User from "./dispatch";
import JobCard from "./JobCard";
import { toast } from "react-hot-toast";
import QrCodeScannerIcon from "@mui/icons-material/QrCodeScanner";
import { Button, Typography } from "@mui/material";
import ListAltIcon from "@mui/icons-material/ListAlt";
import PackageTable from "./PackageTable";
import LogoutIcon from "@mui/icons-material/Logout";
import { FaBoxOpen } from "react-icons/fa";
import PrinterConnection from "./Printer";
import DataTable from "./DataTable";
import Profile from "./Profile";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import SwipeableDrawer from "@mui/material/SwipeableDrawer";
import ProtectedRoute from "./ProtectedRoute"; // Import the ProtectedRoute component

const drawerWidth = 240;
const primaryColor = "#448ee4";
const dropdownColor = "#B7E9F7";
const collapsedWidth = 64;
const mobileDrawerWidth = 280;

// Responsive Main component
const Main = styled("main", {
  shouldForwardProp: (prop) => prop !== "open" && prop !== "isMobile",
})(({ theme, open, isMobile, isTablet }) => ({
  flexGrow: 1,
  padding: isMobile ? theme.spacing(2) : theme.spacing(3),
  transition: theme.transitions.create("margin", {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  marginLeft: 0,
  ...(!isMobile &&
    !isTablet && {
      marginLeft: open ? 0 : 0,
      transition: theme.transitions.create("margin", {
        easing: theme.transitions.easing.easeOut,
        duration: theme.transitions.duration.enteringScreen,
      }),
    }),
  ...(isMobile && {
    marginLeft: 0,
    width: "100%",
  }),
}));

// Responsive AppBar
const AppBar = styled(MuiAppBar, {
  shouldForwardProp: (prop) => prop !== "open" && prop !== "isMobile",
})(({ theme, open, isMobile, isTablet }) => ({
  backgroundColor: "#39a3dd",
  color: "white",
  transition: theme.transitions.create(["margin", "width"], {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  ...(isMobile && {
    marginLeft: 0,
    width: "100%",
  }),
  ...(isTablet && {
    marginLeft: collapsedWidth,
    width: `calc(100% - ${collapsedWidth}px)`,
  }),
  ...(!isMobile &&
    !isTablet && {
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
    }),
}));

const DrawerHeader = styled("div")(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  padding: theme.spacing(1),
  justifyContent: "center",
  flexDirection: "column",
  minHeight: 64,
  [theme.breakpoints.down("sm")]: {
    minHeight: 56,
  },
}));

// Enhanced Permission Check Hook with Operator support
const usePermissions = () => {
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

  // New function to check if user is operator
  const isOperator = () => {
    const role = getRole();
    return role && role.toLowerCase() === "operator";
  };

  const hasPermission = (perm) => {
    console.log("Drawer: Checking permission:", perm, "for role:", getRole()); // Debug log

    // Admin has all permissions
    if (isAdmin()) {
      console.log("Drawer: Admin access granted");
      return true;
    }

    // Operator has specific permissions - handle this BEFORE regular permission check
    if (isOperator()) {
      const operatorPermissions = ["scan_invoice", "view_dispatch"];
      const hasAccess = operatorPermissions.includes(perm);
      console.log(
        "Drawer: Operator permission check:",
        perm,
        "in",
        operatorPermissions,
        "=",
        hasAccess
      );
      return hasAccess;
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
    const hasRegularPermission =
      permissions &&
      typeof permissions === "object" &&
      permissions[actualPermissionKey] === true;

    console.log(
      "Drawer: Regular permission check:",
      perm,
      "->",
      actualPermissionKey,
      "=",
      hasRegularPermission
    );
    return hasRegularPermission;
  };

  return { isAdmin, isOperator, hasPermission, getRole, getPermissions };
};


const useUserInfo = () => {
  const getUserInfo = () => {
    try {
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        return JSON.parse(storedUser);
      }
      return null;
    } catch (error) {
      console.warn("Failed to parse user info:", error);
      return null;
    }
  };

  const getOperatorId = () => {
    const user = getUserInfo();
    return user?.operatorId || null;
  };

  const getUserRole = () => {
    const user = getUserInfo();
    return user?.role || localStorage.getItem("role") || "";
  };

  const getUserDisplayName = () => {
    const user = getUserInfo();
    if (user?.operatorId) {
      return `Operator Id: ${user.operatorId}`;
    }
    // For other user types, you might want to display username or name
    return user?.role || user?.role || "Admin";
  };

  return { getUserInfo, getOperatorId, getUserRole, getUserDisplayName };
};

// Mobile-friendly drawer content
const MobileDrawerContent = ({
  open,
  isAdmin,
  isOperator,
  hasPermission,
  handleMenuClick,
  handlePartMasterClick,
  isActive,
  isPartMasterActive,
  dropdownOpen,
  activePath,
  getMenuItemStyle,
  getDropdownStyle,
  handleLogout,
  onClose,
}) => {
  return (
    <Box
      sx={{
        width: mobileDrawerWidth,
        height: "100%",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <DrawerHeader>
        <Box
          sx={{
            width: "100%",
            display: "flex",
            justifyContent: "center",
            mb: 1,
          }}
        >
          <img
            src={companyLogo}
            alt="Company Logo"
            style={{ maxWidth: "180px", height: "auto" }}
          />
        </Box>
        <Typography variant="body2" color="textSecondary" align="center">
          Welcome back!
        </Typography>
      </DrawerHeader>
      <Divider />

      <List sx={{ flexGrow: 1, pt: 2 }}>
        {/* Dashboard - Always accessible */}
        <ListItem disablePadding sx={{ mb: 1 }}>
          <ListItemButton
            selected={isActive("/dashboard")}
            onClick={() => {
              handleMenuClick("📊 Dashboard", null, "/dashboard");
              onClose();
            }}
            sx={{
              ...getMenuItemStyle(isActive("/dashboard")),
              borderRadius: 2,
              mx: 1,
              py: 1.5,
            }}
          >
            <ListItemIcon>
              <DashboardIcon />
            </ListItemIcon>
            <ListItemText
              primary="Dashboard"
              primaryTypographyProps={{ fontWeight: "medium" }}
            />
          </ListItemButton>
        </ListItem>

        {/* Part Master - Hidden for operators, visible for admin and users with manage_parts permission */}
        {!isOperator() && (isAdmin() || hasPermission("manage_parts")) && (
          <>
            <ListItem disablePadding sx={{ mb: 1 }}>
              <ListItemButton
                selected={isPartMasterActive()}
                onClick={handlePartMasterClick}
                sx={{
                  ...getMenuItemStyle(isPartMasterActive()),
                  borderRadius: 2,
                  mx: 1,
                  py: 1.5,
                }}
              >
                <ListItemIcon>
                  <BuildIcon />
                </ListItemIcon>
                <ListItemText
                  primary="Part Master"
                  primaryTypographyProps={{ fontWeight: "medium" }}
                />
                {dropdownOpen ? <ExpandLess /> : <ExpandMore />}
              </ListItemButton>
            </ListItem>

            <Collapse in={dropdownOpen} timeout="auto" unmountOnExit>
              <List component="div" disablePadding sx={{ pl: 2 }}>
                <ListItem disablePadding sx={{ mb: 0.5 }}>
                  <ListItemButton
                    selected={isActive("/part")}
                    sx={{
                      ...getDropdownStyle(isActive("/part")),
                      borderRadius: 2,
                      mx: 1,
                      py: 1,
                    }}
                    onClick={() => {
                      handleMenuClick("🛠️ Part Master", "✙ Add", "/part");
                      onClose();
                    }}
                  >
                    <ListItemIcon>
                      <AddIcon />
                    </ListItemIcon>
                    <ListItemText primary="Add Part" />
                  </ListItemButton>
                </ListItem>

                <ListItem disablePadding sx={{ mb: 0.5 }}>
                  <ListItemButton
                    selected={isActive("/part_Table")}
                    sx={{
                      ...getDropdownStyle(isActive("/part_Table")),
                      borderRadius: 2,
                      mx: 1,
                      py: 1,
                    }}
                    onClick={() => {
                      handleMenuClick("🛠️ Part Master", "Table", "/part_Table");
                      onClose();
                    }}
                  >
                    <ListItemIcon>
                      <TableChartIcon />
                    </ListItemIcon>
                    <ListItemText primary="Part Table" />
                  </ListItemButton>
                </ListItem>
              </List>
            </Collapse>
          </>
        )}

        {/* Invoice Scanning - Visible for operators, admin, and users with scan_invoice permission */}
        {(isOperator() || isAdmin() || hasPermission("scan_invoice")) && (
          <ListItem disablePadding sx={{ mb: 1 }}>
            <ListItemButton
              selected={isActive("/Card")}
              onClick={() => {
                handleMenuClick("📱 Invoice Scanning", null, "/Card");
                onClose();
              }}
              sx={{
                ...getMenuItemStyle(isActive("/Card")),
                borderRadius: 2,
                mx: 1,
                py: 1.5,
              }}
            >
              <ListItemIcon>
                <QrCodeScannerIcon />
              </ListItemIcon>
              <ListItemText
                primary="Invoice Scanning"
                primaryTypographyProps={{ fontWeight: "medium" }}
              />
            </ListItemButton>
          </ListItem>
        )}

        {/* Dispatch - Visible for operators, admin, and users with view_dispatch permission */}
        {(isOperator() || isAdmin() || hasPermission("view_dispatch")) && (
          <ListItem disablePadding sx={{ mb: 1 }}>
            <ListItemButton
              selected={isActive("/dispatch")}
              onClick={() => {
                handleMenuClick("📦 Dispatch", null, "/dispatch");
                onClose();
              }}
              sx={{
                ...getMenuItemStyle(isActive("/dispatch")),
                borderRadius: 2,
                mx: 1,
                py: 1.5,
              }}
            >
              <ListItemIcon>
                <FaBoxOpen style={{ fontSize: "1.5rem" }} />
              </ListItemIcon>
              <ListItemText
                primary="Dispatch"
                primaryTypographyProps={{ fontWeight: "medium" }}
              />
            </ListItemButton>
          </ListItem>
        )}

        {/* User Master - Hidden for operators, visible for admin and users with manage_users permission */}
        {!isOperator() && (isAdmin() || hasPermission("manage_users")) && (
          <ListItem disablePadding sx={{ mb: 1 }}>
            <ListItemButton
              selected={isActive("/user")}
              onClick={() => {
                handleMenuClick("👤 User Master", null, "/user");
                onClose();
              }}
              sx={{
                ...getMenuItemStyle(isActive("/user")),
                borderRadius: 2,
                mx: 1,
                py: 1.5,
              }}
            >
              <ListItemIcon>
                <PersonIcon />
              </ListItemIcon>
              <ListItemText
                primary="User Master"
                primaryTypographyProps={{ fontWeight: "medium" }}
              />
            </ListItemButton>
          </ListItem>
        )}
      </List>

      <Divider />

      {/* Profile - Always accessible */}
      <ListItem disablePadding sx={{ my: 1 }}>
        <ListItemButton
          selected={isActive("/profile")}
          onClick={() => {
            handleMenuClick("👤 User Profile", null, "/profile");
            onClose();
          }}
          sx={{
            ...getMenuItemStyle(isActive("/profile")),
            borderRadius: 2,
            mx: 1,
            py: 1.5,
          }}
        >
          <ListItemIcon>
            <AccountCircleIcon />
          </ListItemIcon>
          <ListItemText
            primary="Profile"
            primaryTypographyProps={{ fontWeight: "medium" }}
          />
        </ListItemButton>
      </ListItem>

      <Divider />

      {/* Logout */}
      <ListItem disablePadding sx={{ mb: 2 }}>
        <ListItemButton
          onClick={() => {
            handleLogout();
            onClose();
          }}
          sx={{
            color: "#448ee4",
            borderRadius: 2,
            mx: 1,
            py: 1.5,
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
          <ListItemText
            primary="Logout"
            primaryTypographyProps={{ fontWeight: "medium", color: "#448ee4" }}
          />
        </ListItemButton>
      </ListItem>
    </Box>
  );
};

function PersistentDrawerLeft() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const isTablet = useMediaQuery(theme.breakpoints.between("md", "lg"));
  const { isAdmin, isOperator, hasPermission } = usePermissions();
   const { getUserDisplayName, getOperatorId } = useUserInfo();

  const [open, setOpen] = useState(() => {
    if (isMobile) return false;
    const savedOpen = localStorage.getItem("drawerOpen");
    return savedOpen ? JSON.parse(savedOpen) : false;
  });

  const [mobileOpen, setMobileOpen] = useState(false);
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

  // Handle responsive drawer behavior
  useEffect(() => {
    if (isMobile) {
      setOpen(false);
    } else if (isTablet) {
      setOpen(false);
    }
  }, [isMobile, isTablet]);

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
      "/profile": "👤 User Profile",
      "/table_List": "📦 Dispatch > Table List",
      "/Data_Table": "📱 Invoice Scanning > Data Table",
    };

    const currentMenu = pathToMenuMap[location.pathname];
    if (currentMenu) {
      setSelectedMenu(currentMenu);
      localStorage.setItem("selectedMenu", currentMenu);
    }
  }, [location]);

  useEffect(() => {
    if (!isMobile) {
      localStorage.setItem("drawerOpen", JSON.stringify(open));
    }
  }, [open, isMobile]);

  useEffect(() => {
    localStorage.setItem("dropdownOpen", JSON.stringify(dropdownOpen));
  }, [dropdownOpen]);

  const handleDrawerOpen = () => setOpen(true);
  const handleDrawerClose = () => setOpen(false);
  const handleMobileDrawerToggle = () => setMobileOpen(!mobileOpen);

  const handlePartMasterClick = () => {
    if (isMobile) {
      setDropdownOpen(!dropdownOpen);
    } else if (!open) {
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
    if (!submenu && !isMobile) {
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
    return !open && !isMobile ? (
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

  // Desktop/Tablet Drawer Content
  const DesktopDrawerContent = () => (
    <>
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
        {/* Dashboard - Always accessible */}
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

        {/* Part Master - Hidden for operators, visible for admin and users with manage_parts permission */}
        {!isOperator() && (isAdmin() || hasPermission("manage_parts")) && (
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

        {/* Dropdown - Hidden for operators, visible for admin and users with manage_parts permission */}
        {!isOperator() && (isAdmin() || hasPermission("manage_parts")) && (
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
                      handleMenuClick("🛠️ Part Master", "Table", "/part_Table")
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

        {/* Invoice Scanning - Visible for operators, admin, and users with scan_invoice permission */}
        {(isOperator() || isAdmin() || hasPermission("scan_invoice")) && (
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

        {/* Dispatch - Visible for operators, admin, and users with view_dispatch permission */}
        {(isOperator() || isAdmin() || hasPermission("view_dispatch")) && (
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

        {/* User Master - Hidden for operators, visible for admin and users with manage_users permission */}
        {!isOperator() && (isAdmin() || hasPermission("manage_users")) && (
          <ListItemWithTooltip tooltip="User Master">
            <ListItem disablePadding>
              <ListItemButton
                selected={isActive("/user")}
                onClick={() => handleMenuClick("👤 User Master", null, "/user")}
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

      {/* Expand/Collapse - Desktop only */}
      {!isMobile && (
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
      )}

      <Divider sx={{ marginY: 1 }} />

      {/* User Profile - Always accessible */}
      <ListItemWithTooltip tooltip="User Profile">
        <ListItem disablePadding>
          <ListItemButton
            selected={isActive("/profile")}
            onClick={() => handleMenuClick("👤 User Profile", null, "/profile")}
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
    </>
  );

  return (
    <Box sx={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      <CssBaseline />

      {/* AppBar */}
      <AppBar
        position="fixed"
        open={open}
        isMobile={isMobile}
        isTablet={isTablet}
      >
        <Toolbar
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            pr: 2,
          }}
        >
          {/* Mobile menu button */}
          {isMobile && (
            <IconButton
              color="inherit"
              aria-label="open drawer"
              onClick={handleMobileDrawerToggle}
              edge="start"
              sx={{ mr: 2 }}
            >
              <MenuIcon />
            </IconButton>
          )}

          {/* Left side - Menu name */}
          <Typography
            variant="h6"
            noWrap
            sx={{
              fontSize: isMobile ? "16px" : "18px",
              fontWeight: "bold",
              flexGrow: isMobile ? 0 : 1,
              mr: 2,
            }}
          >
            {selectedMenu}
          </Typography>

          {/* Center/Right side - User info and action buttons */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            {/* User Display Name */}
            <Typography
              variant="body2"
              sx={{
                fontSize: isMobile ? "12px" : "18px",
                fontWeight: "600",
                bgcolor:"black",
                px: 2,
                py: 0.5,
                borderRadius: 2,
                minWidth: isMobile ? "auto" : "120px",
                textAlign: "center",
              }}
            >
              {getUserDisplayName()}
            </Typography>

            {/* Action buttons */}
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
                  fontSize: isMobile ? "12px" : "14px",
                  px: isMobile ? 1 : 2,
                }}
                size={isMobile ? "small" : "medium"}
              >
                {!isMobile && "Table List"}
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
                  fontSize: isMobile ? "12px" : "14px",
                  px: isMobile ? 1 : 2,
                }}
                size={isMobile ? "small" : "medium"}
              >
                {!isMobile && "Data Table"}
              </Button>
            )}
          </Box>
        </Toolbar>
      </AppBar>

      {/* Mobile Drawer */}
      {isMobile ? (
        <SwipeableDrawer
          variant="temporary"
          anchor="left"
          open={mobileOpen}
          onClose={handleMobileDrawerToggle}
          onOpen={handleMobileDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            "& .MuiDrawer-paper": {
              width: mobileDrawerWidth,
              boxSizing: "border-box",
              backgroundColor: "white",
            },
          }}
        >
          <MobileDrawerContent
            open={true}
            isAdmin={isAdmin}
            isOperator={isOperator}
            hasPermission={hasPermission}
            handleMenuClick={handleMenuClick}
            handlePartMasterClick={handlePartMasterClick}
            isActive={isActive}
            isPartMasterActive={isPartMasterActive}
            dropdownOpen={dropdownOpen}
            activePath={activePath}
            getMenuItemStyle={getMenuItemStyle}
            getDropdownStyle={getDropdownStyle}
            handleLogout={handleLogout}
            onClose={handleMobileDrawerToggle}
          />
        </SwipeableDrawer>
      ) : (
        /* Desktop/Tablet Drawer */
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
          <DesktopDrawerContent />
        </Drawer>
      )}

      {/* Main Content with Protected Routes */}
      <Main open={open} isMobile={isMobile} isTablet={isTablet}>
        <DrawerHeader />
        <Routes>
          {/* Public Routes - Profile hidden for operators */}
          <Route path="/dashboard" element={<Dashboard />} />
          {!isOperator() && <Route path="/profile" element={<Profile />} />}

          {/* Protected Routes for Part Master - Blocked for operators */}
          <Route
            path="/part"
            element={
              <ProtectedRoute
                requiredPermission="manage_parts"
                blockOperator={true}
              >
                <PartMaster />
              </ProtectedRoute>
            }
          />
          <Route
            path="/part_Table"
            element={
              <ProtectedRoute
                requiredPermission="manage_parts"
                blockOperator={true}
              >
                <PartTable />
              </ProtectedRoute>
            }
          />

          {/* Protected Routes for Dispatch - Available for operators */}
          <Route
            path="/dispatch"
            element={
              <ProtectedRoute requiredPermission="view_dispatch">
                <User />
              </ProtectedRoute>
            }
          />
          <Route
            path="/table_List"
            element={
              <ProtectedRoute requiredPermission="view_dispatch">
                <PackageTable />
              </ProtectedRoute>
            }
          />

          {/* Protected Routes for Invoice Scanning - Available for operators */}
          <Route
            path="/Card"
            element={
              <ProtectedRoute requiredPermission="scan_invoice">
                <JobCard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/Data_Table"
            element={
              <ProtectedRoute requiredPermission="scan_invoice">
                <DataTable />
              </ProtectedRoute>
            }
          />

          {/* Protected Routes for User Management - Blocked for operators */}
          <Route
            path="/user"
            element={
              <ProtectedRoute
                requiredPermission="manage_users"
                blockOperator={true}
              >
                <PrinterConnection />
              </ProtectedRoute>
            }
          />
        </Routes>
      </Main>
    </Box>
  );
}

export default PersistentDrawerLeft;
