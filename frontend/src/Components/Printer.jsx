import React, { useState, useEffect } from "react";
import {
  User,
  Eye,
  EyeOff,
  Save,
  Edit2,
  Trash2,
  Plus,
  Search,
  X,
  Settings,
  Shield,
  Loader,
} from "lucide-react";
import { api } from "../apiConfig";

const UserMaster = () => {
  const [users, setUsers] = useState([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    empId: "",
    empName: "",
    email: "",
    password: "",
    role: "",
    status: "Active",
    userRights: {
      partMaster: "Denied",
      dispatch: "Denied",
      scanner: "Denied",
      Admin: "Denied",
    },
  });
  const [errors, setErrors] = useState({});

  // Generate unique alphanumeric employee ID
  const generateEmpId = () => {
    let newId;
    let counter = users.length + 1;
    do {
      newId = `EMP${counter.toString().padStart(3, "0")}`;
      counter++;
    } while (users.some((user) => user.empId === newId));
    return newId;
  };

  // Map frontend data to backend format
  const mapToBackendFormat = (frontendData) => {
    return {
      name: frontendData.empName,
      email: frontendData.email,
      employeeId: frontendData.empId,
      role: frontendData.role,
      password: frontendData.password,
      status: frontendData.status,
      permissions: frontendData.userRights,
    };
  };

  // Map backend data to frontend format
  // Map backend data to frontend format
  const mapToFrontendFormat = (backendData) => {
    return {
      _id: backendData._id, // Include the MongoDB _id
      empId: backendData.employeeId,
      empName: backendData.name,
      email: backendData.email,
      role: backendData.role,
      status: backendData.status,
      userRights: {
        partMaster: backendData.permissions?.partMaster ? "Access" : "Denied",
        dispatch: backendData.permissions?.dispatch ? "Access" : "Denied",
        scanner: backendData.permissions?.scanner ? "Access" : "Denied",
        Admin: backendData.permissions?.admin ? "Access" : "Denied",
      },
    };
  };

  // Fetch all users
  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await api.get("/users");

      if (response.data.success) {
        const mappedUsers = response.data.users.map(mapToFrontendFormat);
        setUsers(mappedUsers);
      } else {
        setError("Failed to fetch users");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to fetch users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.empId) {
      newErrors.empId = "Employee ID is required";
    } else if (!/^[A-Z]{3}\d{3}$/.test(formData.empId)) {
      newErrors.empId = "Employee ID must be format: EMP001";
    } else if (
      !editingUser &&
      users.some((user) => user.empId === formData.empId)
    ) {
      newErrors.empId = "Employee ID already exists";
    }

    if (!formData.empName.trim()) {
      newErrors.empName = "User name is required";
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }

    if (!formData.role.trim()) {
      newErrors.role = "Role is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      setSaving(true);
      setError("");

      const backendData = mapToBackendFormat(formData);

      if (editingUser) {
        const response = await api.put(
          `/users/${editingUser._id || editingUser.empId}`,
          backendData
        );

        if (response.data.success) {
          await fetchUsers();
          resetForm();
        } else {
          setError("Failed to update user");
        }
      } else {
        const response = await api.post("/create", backendData);

        if (response.data.success) {
          await fetchUsers();
          resetForm();
        } else {
          setError("Failed to create user");
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save user");
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setFormData({
      empId: "",
      empName: "",
      email: "",
      password: "",
      role: "",
      status: "Active",
      userRights: {
        partMaster: "Denied",
        dispatch: "Denied",
        scanner: "Denied",
        Admin: "Denied",
      },
    });
    setErrors({});
    setEditingUser(null);
    setIsFormOpen(false);
    setShowPassword(false);
    setError("");
  };

  const handleEdit = (user) => {
    setFormData(user);
    setEditingUser(user);
    setIsFormOpen(true);
  };

  const handleDelete = async (empId) => {
    if (!window.confirm("Are you sure you want to delete this user?")) {
      return;
    }

    try {
      setError("");
      const userToDelete = users.find((user) => user.empId === empId);

      const response = await api.delete(`/users/${userToDelete._id || empId}`);

      if (response.data.success) {
        await fetchUsers();
      } else {
        setError("Failed to delete user");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete user");
    }
  };

  const handleNewUser = () => {
    resetForm();
    setFormData((prev) => ({ ...prev, empId: generateEmpId() }));
    setIsFormOpen(true);
  };

  const handlePermissionChange = (module, permission) => {
    setFormData((prev) => ({
      ...prev,
      userRights: {
        ...prev.userRights,
        [module]: permission,
      },
    }));
  };

  const filteredUsers = users.filter(
    (user) =>
      user.empName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.empId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const modules = [
    {
      key: "partMaster",
      label: "Part Master",
      icon: "🏭",
      color: "bg-blue-50 border-blue-200",
    },
    {
      key: "dispatch",
      label: "Dispatch",
      icon: "📦",
      color: "bg-green-50 border-green-200",
    },
    {
      key: "scanner",
      label: "Invoice Scanning",
      icon: "📱",
      color: "bg-purple-50 border-purple-200",
    },
    {
      key: "Admin",
      label: "Admin",
      icon: "📊",
      color: "bg-orange-50 border-orange-200",
    },
  ];
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white/90 backdrop-blur-xl shadow-2xl border-b border-white/30 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-8 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <div className="relative">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700 rounded-2xl flex items-center justify-center shadow-2xl">
                  <User className="h-8 w-8 text-white" />
                </div>
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full border-3 border-white shadow-lg animate-pulse"></div>
              </div>
              <div>
                <h1 className="text-4xl font-black bg-gradient-to-r from-gray-900 via-blue-800 to-purple-800 bg-clip-text text-transparent">
                  User Management
                </h1>
                <p className="text-gray-600 font-semibold text-lg mt-1">
                  Manage employees and permissions with ease
                </p>
              </div>
            </div>
            <button
              onClick={handleNewUser}
              disabled={loading}
              className="group relative px-8 py-4 bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 text-white rounded-2xl font-bold shadow-2xl hover:shadow-3xl transform hover:-translate-y-1 hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex items-center space-x-3">
                <Plus className="h-6 w-6 group-hover:rotate-180 transition-transform duration-300" />
                <span className="text-lg">Add User</span>
              </div>
              <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-400 rounded-2xl opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 py-10">
        {/* Error Display */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4">
            <div className="flex items-center space-x-2">
              <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                <X className="h-3 w-3 text-white" />
              </div>
              <p className="text-red-700 font-medium">{error}</p>
              <button
                onClick={() => setError("")}
                className="ml-auto text-red-500 hover:text-red-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Search and Stats */}
        <div className="mb-10 grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-2">
            <div className="relative group">
              <Search className="absolute left-5 top-1/2 transform -translate-y-1/2 h-6 w-6 text-gray-400 group-focus-within:text-blue-500 transition-colors duration-200" />
              <input
                type="text"
                placeholder="Search users by name, email, or role..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-14 pr-6 py-5 bg-white/90 backdrop-blur-md border-2 border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 shadow-lg hover:shadow-xl transition-all duration-300 text-lg font-medium"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors duration-200"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>
          </div>
          <div className="group bg-gradient-to-br from-white to-blue-50 backdrop-blur-xl rounded-2xl p-6 border-2 border-gray-200 shadow-lg hover:shadow-2xl transform hover:-translate-y-1 transition-all duration-300">
            <div className="flex items-center space-x-4">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform duration-300">
                <User className="h-7 w-7 text-white" />
              </div>
              <div>
                <p className="text-gray-600 text-sm font-semibold uppercase tracking-wide">
                  Total Users
                </p>
                <p className="text-3xl font-black text-gray-900 leading-none">
                  {users.length}
                </p>
              </div>
            </div>
          </div>
          <div className="group bg-gradient-to-br from-white to-emerald-50 backdrop-blur-xl rounded-2xl p-6 border-2 border-gray-200 shadow-lg hover:shadow-2xl transform hover:-translate-y-1 transition-all duration-300">
            <div className="flex items-center space-x-4">
              <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-green-600 rounded-2xl flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform duration-300">
                <Shield className="h-7 w-7 text-white" />
              </div>
              <div>
                <p className="text-gray-600 text-sm font-semibold uppercase tracking-wide">
                  Active Users
                </p>
                <p className="text-3xl font-black text-gray-900 leading-none">
                  {users.filter((u) => u.status === "Active").length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white/80 backdrop-blur rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader className="h-8 w-8 text-blue-600 animate-spin" />
                <span className="ml-3 text-lg font-medium text-gray-700">
                  Loading users...
                </span>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                      Employee
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                      Contact
                    </th>

                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                      Role
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredUsers.map((user, index) => (
                    <tr
                      key={user.empId}
                      className="hover:bg-blue-50/50 transition-colors duration-150"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                            {user.empName.charAt(0)}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">
                              {user.empName}
                            </p>
                            <p className="text-sm text-gray-500 font-mono">
                              {user.empId}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-gray-900">{user.email}</p>
                      </td>

                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                            user.status === "Active"
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          <div
                            className={`w-2 h-2 rounded-full mr-2 ${
                              user.status === "Active"
                                ? "bg-green-600"
                                : "bg-red-600"
                            }`}
                          ></div>
                          {user.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleEdit(user)}
                            className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors duration-150"
                            title="Edit User"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(user.empId)}
                            className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors duration-150"
                            title="Delete User"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {!loading && filteredUsers.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-gray-500">
                <User className="h-16 w-16 text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No users found
                </h3>
                <p>
                  {searchTerm
                    ? "Try adjusting your search criteria."
                    : "Add your first user to get started."}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal */}
      {isFormOpen && (
        <div className="fixed mt-12 inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-6xl max-h-[95vh] flex flex-col shadow-2xl border border-gray-200">
            <div className="flex-1 overflow-auto">
              <div className="grid grid-cols-1 lg:grid-cols-2 h-full">
                {/* LEFT COLUMN (unchanged) */}

                <div className="p-8 bg-gray-50 border-r border-gray-200">
                  <div className="flex items-center space-x-3 mb-8">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                      <User className="h-5 w-5 text-blue-600" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900">
                      User Details
                    </h3>
                  </div>

                  <div className="space-y-6">
                    {/* User Name */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        User Name *
                      </label>
                      <input
                        type="text"
                        value={formData.empName}
                        onChange={(e) =>
                          setFormData({ ...formData, empName: e.target.value })
                        }
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                        placeholder="John Doe"
                      />
                      {errors.empName && (
                        <p className="text-red-500 text-sm mt-1 font-medium">
                          {errors.empName}
                        </p>
                      )}
                    </div>

                    {/* Email */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Email Address *
                      </label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) =>
                          setFormData({ ...formData, email: e.target.value })
                        }
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                        placeholder="john.doe@archerytech.com"
                      />
                      {errors.email && (
                        <p className="text-red-500 text-sm mt-1 font-medium">
                          {errors.email}
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      {/* Employee ID */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Employee ID *
                        </label>
                        <input
                          type="text"
                          value={formData.empId}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              empId: e.target.value.toUpperCase(),
                            })
                          }
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-100 font-mono font-semibold transition-all duration-200"
                          placeholder="EMP001"
                          maxLength="6"
                          disabled={editingUser !== null}
                        />
                        {errors.empId && (
                          <p className="text-red-500 text-sm mt-1 font-medium">
                            {errors.empId}
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Role *
                        </label>
                        <input
                          type="text"
                          value={formData.role}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              role: e.target.value,
                            })
                          }
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white transition-all duration-200"
                          placeholder="Type role"
                        />
                        {errors.role && (
                          <p className="text-red-500 text-sm mt-1 font-medium">
                            {errors.role}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Role (Free text) */}

                    {/* Password */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Password *
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? "text" : "password"}
                          value={formData.password}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              password: e.target.value,
                            })
                          }
                          className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                          placeholder="Enter password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors duration-200"
                        >
                          {showPassword ? (
                            <EyeOff className="h-5 w-5" />
                          ) : (
                            <Eye className="h-5 w-5" />
                          )}
                        </button>
                      </div>
                      {errors.password && (
                        <p className="text-red-500 text-sm mt-1 font-medium">
                          {errors.password}
                        </p>
                      )}
                    </div>

                    {/* Status */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-3">
                        Status
                      </label>
                      <div className="flex space-x-4">
                        <label className="flex items-center cursor-pointer">
                          <input
                            type="radio"
                            name="status"
                            value="Active"
                            checked={formData.status === "Active"}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                status: e.target.value,
                              })
                            }
                            className="sr-only"
                          />
                          <div
                            className={`flex items-center px-4 py-2 rounded-xl border-2 transition-all duration-200 ${
                              formData.status === "Active"
                                ? "bg-green-50 border-green-500 text-green-700"
                                : "bg-gray-50 border-gray-300 text-gray-500"
                            }`}
                          >
                            <div
                              className={`w-3 h-3 rounded-full mr-2 ${
                                formData.status === "Active"
                                  ? "bg-green-500"
                                  : "bg-gray-400"
                              }`}
                            ></div>
                            <span className="font-semibold">Active</span>
                          </div>
                        </label>
                        <label className="flex items-center cursor-pointer">
                          <input
                            type="radio"
                            name="status"
                            value="Inactive"
                            checked={formData.status === "Inactive"}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                status: e.target.value,
                              })
                            }
                            className="sr-only"
                          />
                          <div
                            className={`flex items-center px-4 py-2 rounded-xl border-2 transition-all duration-200 ${
                              formData.status === "Inactive"
                                ? "bg-red-50 border-red-500 text-red-700"
                                : "bg-gray-50 border-gray-300 text-gray-500"
                            }`}
                          >
                            <div
                              className={`w-3 h-3 rounded-full mr-2 ${
                                formData.status === "Inactive"
                                  ? "bg-red-500"
                                  : "bg-gray-400"
                              }`}
                            ></div>
                            <span className="font-semibold">Inactive</span>
                          </div>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                {/* RIGHT COLUMN - Permissions */}
                <div className="p-8 bg-white">
                  <div className="flex items-center space-x-3 mb-8">
                    <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                      <Settings className="h-5 w-5 text-purple-600" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900">
                      User Rights & Permissions
                    </h3>
                  </div>

                  <div className="space-y-6">
                    <p className="text-sm font-semibold text-gray-700">
                      Module Access:
                    </p>

                    <div className="grid grid-cols-3 gap-3 pb-4 border-b border-gray-200">
                      <div className="text-sm font-semibold text-gray-700">
                        Module
                      </div>
                      <div className="text-center">
                        <div className="text-xs font-semibold text-gray-600 mb-2">
                          Access
                        </div>
                        <div className="w-5 h-5 bg-green-500 rounded mx-auto"></div>
                      </div>
                      <div className="text-center">
                        <div className="text-xs font-semibold text-gray-600 mb-2">
                          Denied
                        </div>
                        <div className="w-5 h-5 bg-red-500 rounded mx-auto"></div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {modules.map((module) => (
                        <div
                          key={module.key}
                          className={`grid grid-cols-3 gap-3 items-center p-4 rounded-xl border-2 ${module.color} transition-all duration-200 hover:shadow-md`}
                        >
                          <div className="flex items-center space-x-3">
                            <span className="text-2xl">{module.icon}</span>
                            <div className="font-semibold text-gray-800">
                              {module.label}
                            </div>
                          </div>

                          {/* Access Button */}
                          <div className="flex justify-center">
                            <button
                              onClick={() =>
                                handlePermissionChange(module.key, "Access")
                              }
                              className={`w-8 h-8 rounded-lg border-2 transition-all duration-200 flex items-center justify-center ${
                                formData.userRights[module.key] === "Access"
                                  ? "bg-green-500 border-green-500"
                                  : "bg-white border-gray-300 hover:border-green-300"
                              }`}
                            />
                          </div>

                          {/* Denied Button */}
                          <div className="flex justify-center">
                            <button
                              onClick={() =>
                                handlePermissionChange(module.key, "Denied")
                              }
                              className={`w-8 h-8 rounded-lg border-2 transition-all duration-200 flex items-center justify-center ${
                                formData.userRights[module.key] === "Denied"
                                  ? "bg-red-500 border-red-500"
                                  : "bg-white border-gray-300 hover:border-red-300"
                              }`}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end space-x-4 p-6 border-t bg-gray-50">
              <button
                onClick={resetForm}
                className="px-6 py-3 bg-gray-200 hover:bg-gray-300 rounded-xl font-semibold text-gray-700 transition-colors duration-200"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={saving}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50"
              >
                {saving ? (
                  "Saving..."
                ) : (
                  <span className="flex items-center">
                    <Save className="h-5 w-5 mr-2" /> Save
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserMaster;
