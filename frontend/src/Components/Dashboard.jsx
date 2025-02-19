import React, { useEffect, useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  Container,
} from "@mui/material";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { api } from "../apiConfig";

const Dashboard = () => {
  const [stats, setStats] = useState({
    parts: 0,
    categories: 0,
    totalCount: 0,
    packageCount: 0,
  });

  const primaryColor = "#39a3dd";
  const secondaryColor = "#e85874";
  const DONUT_COLORS = ["#39a3dd", "#e85874", "#4CAF50", "#FFC107"];

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await api.get("/getAllParts");
        const parts = response.data.parts;

        const partCountResponse = await api.get("/getTotalPartCount");
        const totalPartCount = partCountResponse.data.totalPartCount;

        const packageCountResponse = await api.get("/getTotalPackageCount");
        const totalPackageCount = packageCountResponse.data.totalPackageCount;

        const totalParts = parts.length;
        const categories = new Set(parts.map((part) => part.partName)).size;

        setStats({
          parts: totalParts,
          categories,
          totalCount: totalPartCount,
          packageCount: totalPackageCount,
        });
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 2000);

    return () => clearInterval(interval);
  }, []);

  const MetricCard = ({ title, value, icon }) => (
    <Card
      sx={{
        height: "100%",
        borderLeft: `4px solid ${primaryColor}`,
        borderRadius: "8px",
        boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
      }}
    >
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography color="text.secondary" variant="subtitle2">
              {title}
            </Typography>
            <Typography
              variant="h4"
              sx={{ color: primaryColor, fontWeight: "bold" }}
            >
              {value}
            </Typography>
          </Box>
          <Typography variant="h4" sx={{ color: secondaryColor }}>
            {icon}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );

  const getLastSixMonths = () => {
    const months = [];
    const today = new Date();
    for (let i = 5; i >= 0; i--) {
      const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
      months.push(date.toLocaleString("default", { month: "short" }));
    }
    return months;
  };

  const lineChartData = getLastSixMonths().map((month, index) => ({
    name: month,
    Parts: Math.round(stats.parts * (1 + index * 0.1)),
    Categories: Math.round(stats.categories * (1 + index * 0.05)),
  }));

  const donutChartData = [
    { name: "Total Parts", value: stats.parts },
    { name: "Categories", value: stats.categories },
    { name: "Total Count", value: stats.totalCount },
    { name: "Package Count", value: stats.packageCount },
  ];

  return (
    <Box
      sx={{
        minHeight: "100vh",
        pb: "64px",
        position: "relative",
        boxSizing: "border-box",
      }}
    >
      <Container maxWidth="xl">
        <Box>
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} sm={6} md={3}>
              <MetricCard title="Total Parts" value={stats.parts} icon="📦" />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <MetricCard
                title="Categories"
                value={stats.categories}
                icon="📑"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <MetricCard
                title="Total Parts Count"
                value={stats.totalCount}
                icon="🔢"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <MetricCard
                title="Total Package Count"
                value={stats.packageCount}
                icon="📊"
              />
            </Grid>
          </Grid>

          <Grid container spacing={3} sx={{ mb: 4 }}>
            {" "}
            {/* Added margin bottom */}
            <Grid item xs={12} md={6}>
              <Card sx={{ height: "100%", minHeight: 400 }}>
                <CardContent>
                  <Typography variant="h6" sx={{ color: primaryColor, mb: 2 }}>
                    Growth Trends
                  </Typography>
                  <ResponsiveContainer width="100%" height={340}>
                    <LineChart data={lineChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="Parts"
                        stroke={primaryColor}
                        strokeWidth={2}
                        dot={{ fill: primaryColor }}
                      />
                      <Line
                        type="monotone"
                        dataKey="Categories"
                        stroke={secondaryColor}
                        strokeWidth={2}
                        dot={{ fill: secondaryColor }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card sx={{ height: "100%", minHeight: 400 }}>
                <CardContent>
                  <Typography variant="h6" sx={{ color: primaryColor, mb: 2 }}>
                    Distribution Overview
                  </Typography>
                  <ResponsiveContainer width="100%" height={340}>
                    <PieChart>
                      <Pie
                        data={donutChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        fill="#8884d8"
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, percent }) =>
                          `${name}: ${(percent * 100).toFixed(0)}%`
                        }
                      >
                        {donutChartData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={DONUT_COLORS[index % DONUT_COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>
      </Container>
    </Box>
  );
};

export default Dashboard;
