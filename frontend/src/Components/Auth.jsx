import { useEffect, useState } from "react";
import { toast, ToastContainer } from "react-toastify";
import { useLocation, useNavigate } from "react-router-dom";
import backgroundImage from "../assets/bgImage.jpg";
import logoImage from "../assets/companyLogo.png";
import { api } from "../apiConfig";

const Auth = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isUserLogin, setIsUserLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const endpoint = isUserLogin ? "/api/user/userLogin" : "/login";

      // Clear any existing toasts first
      toast.dismiss();

      console.log(`🔍 Attempting login to: ${endpoint}`);
      console.log(`📧 Email: ${email}`);

      const response = await api.post(endpoint, { email, password });

      // 🔍 DEBUG: Log the actual response
      console.log("✅ Full API Response:", response);
      console.log("📊 Response Data:", response.data);
      console.log("✔️ Success Flag:", response.data?.success);
      console.log("🌐 HTTP Status:", response.status);

      // FIXED: Check for success properly - handle both token-based and non-token responses
      const isSuccessful = response.data?.success === true;

      if (isSuccessful) {
        console.log("🎉 Login successful, processing...");

        toast.success("Login Successful", {
          position: "top-right",
          autoClose: 2000,
        });

        if (isUserLogin) {
          // Handle user login
          if (response.data.user) {
            // Store token if provided (for JWT-based auth)
            if (response.data.token) {
              localStorage.setItem("token", response.data.token);
            }

            // Store user data
            localStorage.setItem("role", response.data.user.role);
            localStorage.setItem(
              "permissions",
              JSON.stringify(response.data.user.permissions || {})
            );
            localStorage.setItem("user", JSON.stringify(response.data.user));

            // Store user ID for session tracking (alternative to JWT)
            localStorage.setItem("userId", response.data.user._id);
            localStorage.setItem("userEmail", response.data.user.email);

            console.log(
              "👤 User login successful, redirecting to /permissions"
            );
            setTimeout(() => navigate("/permissions"), 1500);
          } else {
            throw new Error("User data not found in response");
          }
        } else {
          // Handle admin login
          if (response.data.admin) {
            // Store token if provided
            if (response.data.token) {
              localStorage.setItem("token", response.data.token);
            }

            localStorage.setItem("role", response.data.admin.role);
            localStorage.setItem("user", JSON.stringify(response.data.admin));

            console.log("👑 Admin login successful, redirecting to /dashboard");
            setTimeout(() => navigate("/dashboard"), 1500);
          } else if (
            response.data.user &&
            response.data.user.role === "admin"
          ) {
            // Fallback: treat as admin if user has admin role
            if (response.data.token) {
              localStorage.setItem("token", response.data.token);
            }
            localStorage.setItem("role", response.data.user.role);
            localStorage.setItem("user", JSON.stringify(response.data.user));

            console.log(
              "👑 Admin login (via user) successful, redirecting to /dashboard"
            );
            setTimeout(() => navigate("/dashboard"), 1500);
          } else {
            throw new Error("Admin data not found in response");
          }
        }
      } else {
        // Backend returned failure
        const errorMessage = response.data?.message || "Invalid credentials";
        console.log("❌ Login failed:", errorMessage);

        toast.error(errorMessage, {
          position: "top-right",
          autoClose: 4000,
        });
      }
    } catch (error) {
      console.error("🚨 Login error:", error);

      // Handle different types of errors
      let errorMessage = "Login Failed";

      if (error.response) {
        // Server responded with error status
        console.log("📡 Server error response:", error.response.data);

        // FIXED: Better error handling for different response structures
        if (error.response.data?.success === false) {
          errorMessage = error.response.data.message || "Invalid credentials";
        } else if (error.response.data?.message) {
          errorMessage = error.response.data.message;
        } else {
          errorMessage = `Server error (${error.response.status})`;
        }
      } else if (error.request) {
        // Request was made but no response
        errorMessage = "No response from server. Please check your connection.";
        console.log("📡 No response:", error.request);
      } else if (error.message) {
        // Something else happened
        errorMessage = error.message;
      }

      toast.error(errorMessage, {
        position: "top-right",
        autoClose: 5000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle logout toast message
  useEffect(() => {
    if (location.state?.showToast) {
      toast.success("Logged out successfully", {
        position: "top-right",
        autoClose: 3000,
      });

      // Clear the state to prevent showing toast again
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  // Clear form when switching login types
  useEffect(() => {
    setEmail("");
    setPassword("");
  }, [isUserLogin]);

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: `url(${backgroundImage})` }}
    >
      <div className="bg-white bg-opacity-90 p-8 rounded-lg shadow-lg w-full max-w-md">
        <div className="text-center mb-6">
          <img
            src={logoImage}
            alt="Company Logo"
            className="mx-auto h-16 w-auto mb-4"
          />
          <h2 className="text-2xl font-bold text-gray-900">
            {isUserLogin ? "User Login" : "Admin Login"}
          </h2>
        </div>

        {/* Login Type Toggle */}
        <div className="mb-6">
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              type="button"
              onClick={() => setIsUserLogin(true)}
              className={`flex-1 py-2 px-4 rounded-md font-medium text-sm transition-colors ${
                isUserLogin
                  ? "bg-blue-500 text-white shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
              disabled={isLoading}
            >
              User Login
            </button>
            <button
              type="button"
              onClick={() => setIsUserLogin(false)}
              className={`flex-1 py-2 px-4 rounded-md font-medium text-sm transition-colors ${
                !isUserLogin
                  ? "bg-blue-500 text-white shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
              disabled={isLoading}
            >
              Admin Login
            </button>
          </div>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700"
            >
              Email
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full mt-1 p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoComplete="email"
              required
              disabled={isLoading}
              placeholder="Enter your email"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700"
            >
              Password
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full mt-1 p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoComplete="current-password"
              required
              disabled={isLoading}
              placeholder="Enter your password"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${
              isLoading
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-blue-500 hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            } text-white`}
          >
            {isLoading ? (
              <span className="flex items-center justify-center">
                <svg
                  className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Logging in...
              </span>
            ) : (
              <>{isUserLogin ? "Login as User" : "Login as Admin"} 🔑</>
            )}
          </button>
        </form>

        {/* Help text */}
        <div className="mt-4 text-center">
          <p className="text-sm text-gray-600">
            {isUserLogin
              ? "Login with your employee credentials to access your dashboard"
              : "Login with admin credentials to access the management panel"}
          </p>
        </div>
      </div>

      {/* Toast Container with custom styling */}
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
    </div>
  );
};

export default Auth;
