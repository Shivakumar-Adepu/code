import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./routes/auth";
import scanRoutes from "./routes/scans";

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/codeguard";

// Middlewares
app.use(cors());
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/scans", scanRoutes);

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "CodeGuard API Backend" });
});

// Connect to MongoDB & Start Server
console.log("Connecting to MongoDB...");
mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log("MongoDB database connected successfully.");
    app.listen(PORT, () => {
      console.log(`Express server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Database connection error:", err.message);
    console.warn("Continuing server start without database connection...");
    // Allow server to run on dev even if mongo connection fails, to avoid bricking app
    app.listen(PORT, () => {
      console.log(`Express server running on port ${PORT} (warning: no DB)`);
    });
  });
