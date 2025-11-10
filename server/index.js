import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { createServer } from "http";
import { Server } from "socket.io";
import chatSocket from "./sockets/chatSocket.js";

import { port, mongourl } from "./config/config.js";

// Routes
import adminRoutes from "./routes/adminRoutes.js";
import employeeRoutes from "./routes/employeeRoutes.js";
import attendanceRoutes from "./routes/attendanceRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import leaveRoutes from "./routes/leaveRoutes.js";
import salaryRoutes from "./routes/salaryRoutes.js";
import taskRoutes from "./routes/taskRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import uploadRoutes from "./routes/uploadRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";
import policyRoutes from "./routes/policyRoutes.js";
import eodRoutes from "./routes/eodRoutes.js";
dotenv.config();

const app = express();
const httpServer = createServer(app);

// ✅ Fix for __dirname (needed in ESM)
const __filename = fileURLToPath(import.meta.url);

// ✅ Express middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ CORS setup (merged both versions)
app.use(
  cors({
    origin: [
      "http://localhost:5173", // Local frontend
      "https://samprakshiinfinitysolution-hr-management.onrender.com",
      "https://hr.samprakshiinfinitysolution.com/",
    ],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);

// ✅ Socket.IO with proper CORS + transports fallback
const io = new Server(httpServer, {
  cors: {
    origin: [
      "http://localhost:5173",
      "https://samprakshiinfinitysolution-hr-management.onrender.com",
      "https://hr.samprakshiinfinitysolution.com/",
    ],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  },
  transports: ["websocket", "polling"], // allow fallback
});

// ✅ Initialize chat socket
chatSocket(io);

// ✅ MongoDB connection
mongoose
  .connect(mongourl)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.error("❌ MongoDB Error:", err.message));

// ✅ API routes
app.use("/api/admin", adminRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/leave", leaveRoutes);
app.use("/api/salary", salaryRoutes);
app.use("/api/task", taskRoutes);
app.use("/api/auth", userRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/policies", policyRoutes);
app.use("/api", employeeRoutes); 
app.use("/api/eod", eodRoutes);
// ✅ Health check
app.get("/", (req, res) => {
  res.send("✅ HR Management Backend Running Successfully!");
});

// ✅ Start server
const PORT = process.env.PORT || port || 5002;
httpServer.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
