import dotenv from "dotenv";
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || "4000", 10),
  databaseUrl: process.env.DATABASE_URL || "postgresql://postgres:postgres@127.0.0.1:5432/collaborative_db?schema=public",
  redisHost: process.env.REDIS_HOST || "127.0.0.1",
  redisPort: parseInt(process.env.REDIS_PORT || "6379", 10),
  jwtSecret: process.env.JWT_SECRET || "collaborative-editor-jwt-secret-key-2026",
  clientUrl: (process.env.CLIENT_URL || "http://localhost:5173").replace(/\/+$/, ""),
  serverUrl: (process.env.SERVER_URL || "http://localhost:4000").replace(/\/+$/, ""),
  nodeEnv: process.env.NODE_ENV || "development",
  googleClientId: process.env.GOOGLE_CLIENT_ID || "",
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
  githubClientId: process.env.GITHUB_CLIENT_ID || "",
  githubClientSecret: process.env.GITHUB_CLIENT_SECRET || "",
  compactionDebounceMs: 3000,
  maxLogCompactionCount: 50,
};
