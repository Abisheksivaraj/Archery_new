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
  const [showPassword, setShowPassword] = useState(false);
  const [isUserLogin, setIsUserLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Decide endpoint based on type
      const endpoint = isUserLogin ? "/userLogin" : "/login";

      const response = await api.post(endpoint, {
        email,
        password,
      });

      // Enhanced success toast with user info
      const userName = isUserLogin
        ? response.data.user.name || response.data.user.email
        : response.data.admin.name || response.data.admin.email;

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

      if (isUserLogin) {
        // Store user role + permissions
        localStorage.setItem("role", response.data.user.role);
        localStorage.setItem(
          "permissions",
          JSON.stringify(response.data.user.permissions)
        );
        localStorage.setItem("user", JSON.stringify(response.data.user));

        // Delay navigation to show toast
        setTimeout(() => navigate("/permissions"), 1000);
      } else {
        // Store admin role
        localStorage.setItem("role", response.data.admin.role);
        localStorage.setItem("user", JSON.stringify(response.data.admin));

        // Delay navigation to show toast
        setTimeout(() => navigate("/dashboard"), 1000);
      }
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          "Login failed. Please check your credentials.",
        {
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
        }
      );
    } finally {
      setIsLoading(false);
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
            {isUserLogin ? "User Login" : "Admin Login"}
          </h2>
          <div className="w-16 h-1 bg-blue-500 mx-auto rounded-full"></div>
        </div>

        {/* Login Type Toggle */}
        <div className="mb-6">
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              type="button"
              onClick={() => setIsUserLogin(true)}
              className={`flex-1 py-2 px-4 rounded-md font-medium text-sm transition-all duration-200 ${
                isUserLogin
                  ? "bg-blue-500 text-white shadow-md transform scale-[1.02]"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              }`}
            >
              👤 User Login
            </button>
            <button
              type="button"
              onClick={() => setIsUserLogin(false)}
              className={`flex-1 py-2 px-4 rounded-md font-medium text-sm transition-all duration-200 ${
                !isUserLogin
                  ? "bg-blue-500 text-white shadow-md transform scale-[1.02]"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              }`}
            >
              🔧 Admin Login
            </button>
          </div>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
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

          <button
            type="submit"
            disabled={isLoading}
            className={`w-full py-3 px-4 rounded-lg font-semibold text-white transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
              isLoading
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 transform hover:scale-[1.02] active:scale-[0.98] shadow-md hover:shadow-lg"
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
              <>{isUserLogin ? "Sign in as User" : "Sign in as Admin"} 🔑</>
            )}
          </button>
        </form>

        {/* Help text */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600 leading-relaxed">
            {isUserLogin
              ? "🌟 Access your personalized dashboard with employee credentials"
              : "⚙️ Manage the system with administrator privileges"}
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
