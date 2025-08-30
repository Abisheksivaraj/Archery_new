import { useEffect, useState } from "react";
import { toast, ToastContainer } from "react-toastify";
import { useLocation, useNavigate } from "react-router-dom";
import backgroundImage from "../assets/bgImage.jpg";
import logoImage from "../assets/companyLogo.png";
import { api } from "../apiConfig";

const Auth = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isUserLogin, setIsUserLogin] = useState(true); // Toggle between user and admin login
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();

    try {
      // Decide endpoint based on type
      const endpoint = isUserLogin ? "/userLogin" : "/login";

      const response = await api.post(endpoint, {
        email,
        password,
      });

      toast.success("Login Successful", { position: "top-right" });

      localStorage.setItem("token", response.data.token);

      if (isUserLogin) {
        // Store user role + permissions
        localStorage.setItem("role", response.data.user.role);
        localStorage.setItem(
          "permissions",
          JSON.stringify(response.data.user.permissions)
        );
        localStorage.setItem("user", JSON.stringify(response.data.user)); // ✅ save user object
        navigate("/permissions");
      } else {
        // Store admin role
        localStorage.setItem("role", response.data.admin.role);
        localStorage.setItem("user", JSON.stringify(response.data.admin)); // ✅ save admin object
        navigate("/dashboard");
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Login Failed", {
        position: "top-right",
      });
    }
  };

  const location = useLocation();

  useEffect(() => {
    if (location.state?.showToast) {
      toast.success("Logged out successfully");
    }
  }, [location.state]);

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
              required
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
              required
            />
          </div>

          <button
            type="submit"
            className="w-full bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
          >
            {isUserLogin ? "Login as User" : "Login as Admin"} 🔑
          </button>
        </form>

        {/* Optional: Display different help text based on login type */}
        <div className="mt-4 text-center">
          <p className="text-sm text-gray-600">
            {isUserLogin
              ? "Login with your employee credentials to access your dashboard"
              : "Login with admin credentials to access the management panel"}
          </p>
        </div>
      </div>

      <ToastContainer />
    </div>
  );
};

export default Auth;
