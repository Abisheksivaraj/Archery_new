import { useEffect, useState } from "react";
import { toast, ToastContainer } from "react-toastify";
import { useLocation, useNavigate } from "react-router-dom";
import backgroundImage from "../assets/bgImage.jpg";
import logoImage from "../assets/companyLogo.png";
import { api } from "../apiConfig";
import "react-toastify/dist/ReactToastify.css";

const Auth = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [operatorId, setOperatorId] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginType, setLoginType] = useState("user"); // 'user', 'admin', 'operator'
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  // Frontend: Streamlined handleOperatorScan function
  const handleOperatorScan = async (scannedId) => {
    setIsLoading(true);

    try {
      const operatorId = scannedId.trim().toUpperCase();

      // Validate format before making API calls
      if (!/^[A-Z][0-9]{5}$/.test(operatorId)) {
        throw new Error(
          "Invalid format. Use: Letter + 5 digits (e.g., N95421)"
        );
      }

      let response;
      let isNewOperator = false;

      try {
        // Step 1: Try to login existing operator
        response = await api.post("/operatorLogin", { operatorId });

        // Existing operator found
        toast.success(`Welcome back, Operator ${operatorId}!`, {
          position: "top-right",
          autoClose: 2500,
          style: {
            background: "linear-gradient(90deg, #10b981, #059669)",
            color: "white",
            fontWeight: "500",
          },
        });
      } catch (loginError) {
        // Step 2: Operator doesn't exist, auto-create them
        if (
          loginError.response?.status === 401 ||
          loginError.response?.status === 404
        ) {
          toast.info(
            `🆕 First time scan - Creating Operator ${operatorId}...`,
            {
              position: "top-right",
              autoClose: 2000,
              style: {
                background: "linear-gradient(90deg, #3b82f6, #2563eb)",
                color: "white",
              },
            }
          );

          // Auto-create the new operator
          response = await api.post("/createOperator", { operatorId });
          isNewOperator = true;

          toast.success(`✅ Operator ${operatorId} created & logged in!`, {
            position: "top-right",
            autoClose: 3000,
            style: {
              background: "linear-gradient(90deg, #10b981, #059669)",
              color: "white",
              fontWeight: "500",
            },
          });
        } else {
          // Handle other errors (validation, server error, etc.)
          throw loginError;
        }
      }

      // Success - store auth data and navigate
      localStorage.setItem("token", response.data.token);
      localStorage.setItem("role", response.data.operator.role);
      localStorage.setItem("user", JSON.stringify(response.data.operator));

      setOperatorId(""); // Clear input
      setTimeout(() => navigate("/Card"), 1000);
    } catch (error) {
      console.error("Operator scan error:", error);

      let errorMessage = "Failed to process operator ID";
      if (error.response?.status === 400) {
        errorMessage =
          error.response.data.message || "Invalid operator ID format";
      } else if (error.message) {
        errorMessage = error.message;
      }

      toast.error(errorMessage, {
        position: "top-right",
        autoClose: 4000,
        style: {
          background: "linear-gradient(90deg, #ef4444, #dc2626)",
          color: "white",
        },
      });

      setOperatorId(""); // Clear input on error
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      let endpoint, payload;

      // Determine endpoint and payload based on login type
      switch (loginType) {
        case "user":
          endpoint = "/userLogin";
          payload = { email, password };
          break;
        case "admin":
          endpoint = "/login";
          payload = { email, password };
          break;
        case "operator":
          // Handle operator scan/login
          await handleOperatorScan(operatorId);
          return; // Exit early as handleOperatorScan manages the full flow
        default:
          throw new Error("Invalid login type");
      }

      const response = await api.post(endpoint, payload);

      // Enhanced success toast with user info
      let userName;
      switch (loginType) {
        case "user":
          userName = response.data.user.name || response.data.user.email;
          break;
        case "admin":
          userName = response.data.admin.name || response.data.admin.email;
          break;
      }

      toast.success(`Welcome back, ${userName}!`, {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        style: {
          background: "linear-gradient(90deg, #10b981, #059669)",
          color: "white",
          fontWeight: "500",
        },
      });

      localStorage.setItem("token", response.data.token);

      // Handle navigation based on login type
      if (loginType === "user") {
        localStorage.setItem("role", response.data.user.role);
        localStorage.setItem(
          "permissions",
          JSON.stringify(response.data.user.permissions)
        );
        localStorage.setItem("user", JSON.stringify(response.data.user));
        setTimeout(() => navigate("/permissions"), 1000);
      } else if (loginType === "admin") {
        localStorage.setItem("role", response.data.admin.role);
        localStorage.setItem("user", JSON.stringify(response.data.admin));
        setTimeout(() => navigate("/dashboard"), 1000);
      }
    } catch (error) {
      let errorMessage = "Login failed. Please check your credentials.";
      errorMessage = error.response?.data?.message || errorMessage;

      toast.error(errorMessage, {
        position: "top-right",
        autoClose: 4000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        style: {
          background: "linear-gradient(90deg, #ef4444, #dc2626)",
          color: "white",
          fontWeight: "500",
        },
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle QR code scanning or barcode input
  const handleOperatorIdChange = (e) => {
    const value = e.target.value.trim().toUpperCase();
    setOperatorId(value);

    // Auto-submit if operator ID matches expected format (Letter + 5 digits)
    if (/^[A-Z][0-9]{5}$/.test(value)) {
      // Small delay to allow state update
      setTimeout(() => {
        handleOperatorScan(value);
      }, 100);
    }
  };

  const location = useLocation();

  useEffect(() => {
    if (location.state?.showToast) {
      toast.info("You have been logged out successfully", {
        position: "top-right",
        autoClose: 3000,
        style: {
          background: "linear-gradient(90deg, #3b82f6, #2563eb)",
          color: "white",
          fontWeight: "500",
        },
      });
    }
  }, [location.state]);

  const getLoginTitle = () => {
    switch (loginType) {
      case "user":
        return "User Login";
      case "admin":
        return "Admin Login";
      case "operator":
        return "Operator Scan";
      default:
        return "Login";
    }
  };

  const getHelpText = () => {
    switch (loginType) {
      case "user":
        return "🌟 Access your personalized dashboard with employee credentials";
      case "admin":
        return "⚙️ Manage the system with administrator privileges";
      case "operator":
        return "📷 Scan or enter your operator ID - new operators will be created automatically";
      default:
        return "";
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: `url(${backgroundImage})` }}
    >
      <div className="bg-white bg-opacity-95 p-8 rounded-xl shadow-2xl w-full max-w-md border border-gray-100">
        <div className="text-center mb-6">
          <img
            src={logoImage}
            alt="Company Logo"
            className="mx-auto h-16 w-auto mb-4 drop-shadow-sm"
          />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {getLoginTitle()}
          </h2>
          <div className="w-16 h-1 bg-blue-500 mx-auto rounded-full"></div>
        </div>

        {/* Login Type Toggle - Three Options */}
        <div className="mb-6">
          <div className="flex flex-col gap-2">
            <div className="grid grid-cols-2 bg-gray-100 rounded-lg p-1">
              <button
                type="button"
                onClick={() => setLoginType("user")}
                className={`py-2 px-3 rounded-md font-medium text-xs transition-all duration-200 ${
                  loginType === "user"
                    ? "bg-blue-500 text-white shadow-md transform scale-[1.02]"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                }`}
              >
                👤 User
              </button>
              <button
                type="button"
                onClick={() => setLoginType("admin")}
                className={`py-2 px-3 rounded-md font-medium text-xs transition-all duration-200 ${
                  loginType === "admin"
                    ? "bg-blue-500 text-white shadow-md transform scale-[1.02]"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                }`}
              >
                🔧 Admin
              </button>
            </div>
            <button
              type="button"
              onClick={() => setLoginType("operator")}
              className={`w-full py-2 px-4 rounded-lg font-medium text-sm transition-all duration-200 ${
                loginType === "operator"
                  ? "bg-green-500 text-white shadow-md transform scale-[1.02]"
                  : "bg-gray-100 text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              }`}
            >
              📷 Operator Login
            </button>
          </div>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          {loginType === "operator" ? (
            // Operator ID Scan Field
            <div>
              <label
                htmlFor="operatorId"
                className="block text-sm font-semibold text-gray-700 mb-2"
              >
                📷 Scan or Enter Operator ID
              </label>
              <input
                type="text"
                id="operatorId"
                value={operatorId}
                onChange={handleOperatorIdChange}
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white text-center text-lg font-mono tracking-wider uppercase"
                placeholder="N95421"
                autoFocus
                maxLength={6}
                disabled={isLoading}
              />
              <div className="flex items-center justify-center mt-3 space-x-2">
                <div className="flex items-center text-xs text-green-600">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-2"></span>
                  Auto-scan enabled
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2 text-center">
                📷 Format: Letter + 5 digits (e.g., N95421)
                <br />
                🔧 New operators will be created automatically
              </p>
            </div>
          ) : (
            // Email and Password Fields for User/Admin
            <>
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-semibold text-gray-700 mb-2"
                >
                  📧 Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white"
                  placeholder="Enter your email"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-semibold text-gray-700 mb-2"
                >
                  🔒 Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full p-3 pr-12 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white"
                    placeholder="Enter your password"
                    required
                  />
                  <button
                    type="button"
                    onClick={togglePasswordVisibility}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none focus:text-blue-500 transition-colors duration-200"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21"
                        />
                      </svg>
                    ) : (
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                        />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Only show login button for non-operator types or when operator field is not auto-submitted */}
          {loginType !== "operator" && (
            <button
              type="submit"
              disabled={isLoading}
              className={`w-full py-3 px-4 rounded-lg font-semibold text-white transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                isLoading
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 focus:ring-blue-500 transform hover:scale-[1.02] active:scale-[0.98] shadow-md hover:shadow-lg"
              }`}
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
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
                  Signing in...
                </div>
              ) : (
                <>
                  {loginType === "user" && "Sign in as User 🔑"}
                  {loginType === "admin" && "Sign in as Admin 🔑"}
                </>
              )}
            </button>
          )}

          {/* Loading indicator for operator scan */}
          {loginType === "operator" && isLoading && (
            <div className="flex items-center justify-center py-3">
              <svg
                className="animate-spin -ml-1 mr-3 h-5 w-5 text-green-500"
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
              <span className="text-green-600 font-medium">
                Processing operator scan...
              </span>
            </div>
          )}
        </form>

        {/* Help text */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600 leading-relaxed">
            {getHelpText()}
          </p>
        </div>
      </div>

      {/* Enhanced ToastContainer */}
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={true}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
        toastStyle={{
          borderRadius: "12px",
          boxShadow: "0 10px 25px rgba(0, 0, 0, 0.1)",
          border: "1px solid rgba(255, 255, 255, 0.2)",
        }}
        progressStyle={{
          background: "rgba(255, 255, 255, 0.7)",
        }}
      />
    </div>
  );
};

export default Auth;
