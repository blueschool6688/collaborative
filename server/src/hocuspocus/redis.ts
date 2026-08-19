import { Redis } from "@hocuspocus/extension-redis";
import { config } from "../config.js";

export function createRedisExtension() {
  try {
    return new Redis({
      host: config.redisHost,
      port: config.redisPort,
    });
  } catch (error) {
    console.warn("Could not initialize Redis extension, running standalone:", error);
    return null;
  }
}
