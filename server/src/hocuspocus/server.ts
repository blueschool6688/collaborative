import { Server } from "@hocuspocus/server";
import { onAuthenticateHook } from "./auth.hook.js";
import { onLoadDocumentHook, onStoreDocumentHook } from "./persistence.hook.js";
import { createRedisExtension } from "./redis.js";
import { config } from "../config.js";

export function createHocuspocusServer() {
  const extensions: any[] = [];
  const redisExt = createRedisExtension();
  if (redisExt) {
    extensions.push(redisExt);
  }

  const hocuspocus = Server.configure({
    debounce: config.compactionDebounceMs,
    maxDebounce: 10000,
    extensions,
    onAuthenticate: onAuthenticateHook,
    onLoadDocument: onLoadDocumentHook,
    onStoreDocument: onStoreDocumentHook,
    onConnect: async (data) => {
      console.log(`[Hocuspocus] Connected to document: ${data.documentName}`);
    },
    onDisconnect: async (data) => {
      console.log(`[Hocuspocus] Disconnected from document: ${data.documentName}`);
    },
  });

  return hocuspocus;
}
