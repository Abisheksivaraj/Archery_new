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

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
      }}
    >
      {!isAuthPage && (
        <div style={{}}>
          <Sidebar />
          <div style={{}}>
            <Routes>
              <Route path="/" element={<Auth />} />
            </Routes>
          </div>
        </div>
      )}

      {isAuthPage && (
        <div style={{ flex: 1 }}>
          <Routes>
            <Route path="/" element={<Auth />} />
          </Routes>
        </div>
      )}

      {/* Only show footer when NOT on auth page */}
      {!isAuthPage && (
        <div
          style={{
            position: "fixed",
            bottom: 0,
            left: 0,
            width: "100%",
            backgroundColor: "white",
            zIndex: 1000,
          }}
        >
          <Footer />
        </div>
      )}
    </div>
  );
};

export default App;
