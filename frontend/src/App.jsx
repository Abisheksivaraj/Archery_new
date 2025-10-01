import React from "react";
import {
  BrowserRouter as Router,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import Sidebar from "./Components/Sidebar";
import Footer from "./Components/Footer";
import Auth from "./Components/Auth";

const App = () => {
  const location = useLocation();
  const isAuthPage = location.pathname === "/";
  const isDashboard = location.pathname === "/dashboard";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
        overflow: "auto", // Enable scrolling for the entire app
      }}
    >
      {!isAuthPage && (
        <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
          <Sidebar />
          <div
            style={{
              flex: 1,
              overflow: "auto", // Enable scrolling for content area
              paddingBottom: isDashboard ? 0 : "60px", // Add padding if footer is visible
            }}
          >
            <Routes>
              <Route path="/" element={<Auth />} />
            </Routes>
          </div>
        </div>
      )}

      {isAuthPage && (
        <div style={{ flex: 1, overflow: "auto" }}>
          <Routes>
            <Route path="/" element={<Auth />} />
          </Routes>
        </div>
      )}

      {/* Footer - hidden for Auth and Dashboard pages */}
      {!isAuthPage && !isDashboard && (
        <div
          style={{
            position: "fixed",
            bottom: 0,
            left: 0,
            width: "100%",
            height: "60px", // Fixed height for the footer
            backgroundColor: "white",
            zIndex: 1000,
            boxShadow: "0 -2px 5px rgba(0,0,0,0.1)",
          }}
        >
          <Footer />
        </div>
      )}
    </div>
  );
};

export default App;
