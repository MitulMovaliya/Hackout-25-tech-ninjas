import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import connectDB from "./config/db.js";

// Import routes
import authRoutes from "./routes/auth.js";
import reportRoutes from "./routes/reports.js";
import userRoutes from "./routes/users.js";
import dashboardRoutes from "./routes/dashboard.js";
import leaderboardRoutes from "./routes/leaderboard.js";
import emailRoutes from "./routes/email.js";
import uploadRoutes from "./routes/uploads.js";

// Import middleware
import errorHandler from "./middleware/errorHandler.js";

// Load environment variables
dotenv.config({
  path: "../.env",
});

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files (uploads)
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

connectDB();

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/users", userRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/leaderboard", leaderboardRoutes);
app.use("/api/email", emailRoutes);
app.use("/api/uploads", uploadRoutes);

// Basic route
app.get("/", (req, res) => {
  res.json({
    message: "Welcome to Mangrove API",
    status: "Server is running",
    timestamp: new Date().toISOString(),
  });
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "healthy",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// API routes
app.get("/api", (req, res) => {
  res.json({
    message: "Mangrove Monitoring API",
    version: "1.0.0",
    environment: process.env.NODE_ENV || "development",
    endpoints: {
      auth: "/api/auth - Authentication endpoints",
      reports: "/api/reports - Report management",
      users: "/api/users - User management",
      dashboard: "/api/dashboard - Dashboard data",
      leaderboard: "/api/leaderboard - User rankings",
      health: "/health - Health check",
    },
    documentation: "https://github.com/MitulMovaliya/Hackout-25-tech-ninjas",
  });
});

app.get("/api/test", (req, res) => {
  res.json({
    message: "API is working",
    data: {
      version: "1.0.0",
      environment: process.env.NODE_ENV || "development",
    },
  });
});

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({
    error: "Route not found",
    message: `Cannot ${req.method} ${req.originalUrl}`,
  });
});

// Start server
app.listen(PORT, async () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`🌐 Local: http://localhost:${PORT}`);
});

export default app;
