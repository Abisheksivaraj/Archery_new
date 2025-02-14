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
  const isDashboardPage = location.pathname.includes("/dashboard");

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
      }}
    >
      {!isAuthPage && (
        <div style={{ }}>
          <Sidebar />
          <div style={{  }}>
            <Routes>
              <Route path="/" element={<Auth />} />
              {/* Add your other routes here */}
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

      {/* Only show footer when not on dashboard page */}
      {!isDashboardPage && !Auth && <Footer />}
    </div>
  );
};

export default App;
