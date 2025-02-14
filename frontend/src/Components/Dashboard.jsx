import React from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const primaryColor = "#39a3dd";
const secondaryColor = "#e85874";

const Dashboard = () => {
  const metrics = {
    totalParts: 2547,
    categories: 12,
    totalPartsCount: 15789,
    totalPackageCount: 4231,
  };

  const monthlyData = [
    { name: "Jan", parts: 1200, packages: 400 },
    { name: "Feb", parts: 1500, packages: 450 },
    { name: "Mar", parts: 1800, packages: 520 },
    { name: "Apr", parts: 1600, packages: 480 },
    { name: "May", parts: 2100, packages: 600 },
    { name: "Jun", parts: 1900, packages: 550 },
  ];

  const categoryData = [
    { name: "Electronics", count: 450 },
    { name: "Mechanical", count: 380 },
    { name: "Hydraulic", count: 300 },
    { name: "Electrical", count: 280 },
    { name: "Tools", count: 220 },
  ];

  return (
    <div className="p-2">
      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div
          className="bg-white p-4 rounded-lg shadow-md border-l-4"
          style={{ borderLeftColor: primaryColor }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Total Parts</p>
              <p className="text-2xl font-bold" style={{ color: primaryColor }}>
                {metrics.totalParts}
              </p>
            </div>
            <span className="text-3xl" style={{ color: secondaryColor }}>
              📦
            </span>
          </div>
        </div>

        <div
          className="bg-white p-4 rounded-lg shadow-md border-l-4"
          style={{ borderLeftColor: primaryColor }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Categories</p>
              <p className="text-2xl font-bold" style={{ color: primaryColor }}>
                {metrics.categories}
              </p>
            </div>
            <span className="text-3xl" style={{ color: secondaryColor }}>
              📑
            </span>
          </div>
        </div>

        <div
          className="bg-white p-4 rounded-lg shadow-md border-l-4"
          style={{ borderLeftColor: primaryColor }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Total Parts Count</p>
              <p className="text-2xl font-bold" style={{ color: primaryColor }}>
                {metrics.totalPartsCount}
              </p>
            </div>
            <span className="text-3xl" style={{ color: secondaryColor }}>
              🔢
            </span>
          </div>
        </div>

        <div
          className="bg-white p-4 rounded-lg shadow-md border-l-4"
          style={{ borderLeftColor: primaryColor }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Total Package Count</p>
              <p className="text-2xl font-bold" style={{ color: primaryColor }}>
                {metrics.totalPackageCount}
              </p>
            </div>
            <span className="text-3xl" style={{ color: secondaryColor }}>
              📊
            </span>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-4 rounded-lg shadow-md">
          <h2
            className="text-lg font-semibold mb-4"
            style={{ color: primaryColor }}
          >
            Monthly Trends
          </h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="parts"
                  stroke={primaryColor}
                  name="Parts"
                />
                <Line
                  type="monotone"
                  dataKey="packages"
                  stroke={secondaryColor}
                  name="Packages"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-md">
          <h2
            className="text-lg font-semibold mb-4"
            style={{ color: primaryColor }}
          >
            Parts by Category
          </h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" fill={primaryColor} name="Count" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
