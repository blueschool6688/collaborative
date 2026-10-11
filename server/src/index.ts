import express from "express";
import http from "http";
import cors from "cors";
import { WebSocketServer } from "ws";
import { config } from "./config.js";
import authRoutes from "./routes/auth.routes.js";
import documentRoutes from "./routes/document.routes.js";
import historyRoutes from "./routes/history.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import { createHocuspocusServer } from "./hocuspocus/server.js";

const app = express();

// Middlewares
app.use(
  cors({
    origin: [
      config.clientUrl,
      config.clientUrl.replace(/\/+$/, ""),
      "http://localhost:5173",
      "http://127.0.0.1:5173",
      "http://localhost:3000",
      "http://127.0.0.1:3000",
    ].filter(Boolean),
    credentials: true,
  })
);
app.use(express.json({ limit: "10mb" }));

// Request logger with timestamp
app.use((req, _res, next) => {
  if (req.path !== "/api/health") {
    console.log(`[HTTP] ${req.method} ${req.path}`);
  }
  next();
});

// REST API Endpoints
app.use("/api/auth", authRoutes);
app.use("/api/documents", documentRoutes);
app.use("/api/documents", historyRoutes);
app.use("/api/admin", adminRoutes);

// Health check & Telemetry Ping
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "collaborative-crdt-server",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// Create HTTP Server
const server = http.createServer(app);

const hocuspocus = createHocuspocusServer();

const wss = new WebSocketServer({ noServer: true });

wss.on("connection", (ws, request) => {
  hocuspocus.handleConnection(ws, request);
});

server.on("upgrade", (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit("connection", ws, request);
  });
});

server.listen(config.port, () => {
  console.log(`✨ Server running on http://localhost:${config.port}`);
});
