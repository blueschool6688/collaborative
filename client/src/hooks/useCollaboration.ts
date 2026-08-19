import { useEffect, useState, useMemo, useRef } from "react";
import * as Y from "yjs";
import { HocuspocusProvider } from "@hocuspocus/provider";
import { IndexeddbPersistence } from "y-indexeddb";
import { useAuth } from "../context/AuthContext.js";

export type SyncState = "connected" | "syncing" | "offline" | "error";

export function useCollaboration(documentId: string | null, enabled: boolean = true) {
  const { token, user } = useAuth();
  const [syncState, setSyncState] = useState<SyncState>("syncing");
  const [isReady, setIsReady] = useState(false);
  const [provider, setProvider] = useState<HocuspocusProvider | null>(null);
  const isAuthFailedRef = useRef(false);

  const ydoc = useMemo(() => new Y.Doc(), [documentId]);

  useEffect(() => {
    if (!documentId || !enabled) {
      setProvider(null);
      setIsReady(false);
      return;
    }

    setIsReady(false);
    setSyncState("syncing");
    isAuthFailedRef.current = false;

    // 1. IndexedDB Persistence for instant local cache & offline-first
    const indexeddbProvider = new IndexeddbPersistence(`doc_${documentId}`, ydoc);

    indexeddbProvider.on("synced", () => {
      // Only set ready from IndexedDB if not currently in auth error state
      if (!isAuthFailedRef.current) {
        setIsReady(true);
      }
    });

    // 2. Hocuspocus WebSocket Provider
    const wsUrl = `ws://${window.location.hostname}:4000`;
    const hocuspocus = new HocuspocusProvider({
      url: wsUrl,
      name: documentId,
      document: ydoc,
      token: token || "",
      onConnect: () => {
        isAuthFailedRef.current = false;
        setSyncState("connected");
      },
      onStatus: (data) => {
        if (isAuthFailedRef.current) return;
        if (data.status === "connected") {
          setSyncState("connected");
        } else if (data.status === "connecting") {
          setSyncState("syncing");
        } else {
          setSyncState("offline");
        }
      },
      onSynced: () => {
        isAuthFailedRef.current = false;
        setIsReady(true);
        setSyncState("connected");
      },
      onAuthenticationFailed: () => {
        isAuthFailedRef.current = true;
        setSyncState("error");
        setIsReady(false);
      },
      onClose: () => {
        if (isAuthFailedRef.current) {
          setSyncState("error");
        } else {
          setSyncState("offline");
        }
      },
    });

    // Set local awareness user state
    if (user) {
      hocuspocus.setAwarenessField("user", {
        id: user.id,
        name: user.name,
        color: user.color,
        avatar: user.avatar,
      });
    } else {
      const guestId = `guest_${Math.random().toString(36).substring(2, 6)}`;
      hocuspocus.setAwarenessField("user", {
        id: guestId,
        name: `Guest ${guestId.slice(-4)}`,
        color: "#94a3b8",
      });
    }

    setProvider(hocuspocus);

    return () => {
      hocuspocus.destroy();
      indexeddbProvider.destroy();
      ydoc.destroy();
    };
  }, [documentId, token, ydoc, enabled, user]);

  return {
    ydoc,
    provider,
    syncState,
    isReady,
  };
}
