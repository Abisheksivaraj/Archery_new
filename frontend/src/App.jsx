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
  const location = useLocation(); // Get the current location

  const isAuthPage = location.pathname === "/";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        overflow: "hidden",
      }}
    >
      {!isAuthPage && (
        <div style={{ flex: 1, overflow: "hidden" }}>
          <Sidebar />
        </div>
      )}

      <Routes>
        <Route path="/" element={<Auth />} />
      </Routes>

      <Footer />
    </div>
  );
};

export default App;
