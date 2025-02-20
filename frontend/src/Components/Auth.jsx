import { useEffect, useState } from "react";
import { toast, ToastContainer } from "react-toastify";

import { useLocation, useNavigate } from "react-router-dom";
import backgroundImage from "../assets/bgImage.jpg";
import logoImage from "../assets/companyLogo.png";
import { api } from "../apiConfig";

const Auth = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();

    try {
      const response = await api.post("/login", {
        email,
        password,
      });

      toast.success("Login Successful", { position: "top-right" });

      localStorage.setItem("token", response.data.token);
      localStorage.setItem("role", response.data.admin.role);

      console.log("Login Success:", response.data);
      navigate("/dashboard");
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
      className="flex items-center justify-center min-h-screen w-full bg-cover"
      style={{
        backgroundImage: `url(${backgroundImage})`,
      }}
    >
      <div className="bg-white  shadow-lg rounded-2xl opacity-70 p-8 w-full sm:max-w-sm md:max-w-md">
        <div className="flex justify-center mb-6">
          <img
            src={logoImage}
            alt="Company Logo"
            className="w-full object-cover"
          />
        </div>
        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-gray-600 font-medium text-sm sm:text-base">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full mt-1 p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-gray-600 font-medium text-sm sm:text-base">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full mt-1 p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition duration-200"
          >
            Login 🔑
          </button>
        </form>
      </div>

      <ToastContainer />
    </div>
  );
};

export default Auth;
