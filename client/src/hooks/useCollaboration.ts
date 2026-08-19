import { useEffect, useState, useMemo } from "react";
import * as Y from "yjs";
import { HocuspocusProvider } from "@hocuspocus/provider";
import { IndexeddbPersistence } from "y-indexeddb";
import { useAuth } from "../context/AuthContext.js";

export type SyncState = "connected" | "syncing" | "offline" | "error";

export function useCollaboration(documentId: string | null) {
  const { token, user } = useAuth();
  const [syncState, setSyncState] = useState<SyncState>("syncing");
  const [isReady, setIsReady] = useState(false);
  const [provider, setProvider] = useState<HocuspocusProvider | null>(null);

  const ydoc = useMemo(() => new Y.Doc(), [documentId]);

  useEffect(() => {
    if (!documentId) {
      setProvider(null);
      setIsReady(false);
      return;
    }

    setIsReady(false);
    setSyncState("syncing");

    // 1. IndexedDB Persistence for instant local cache & offline-first
    const indexeddbProvider = new IndexeddbPersistence(`doc_${documentId}`, ydoc);

    indexeddbProvider.on("synced", () => {
      setIsReady(true);
    });

    // 2. Hocuspocus WebSocket Provider
    const wsUrl = `ws://${window.location.hostname}:4000`;
    const hocuspocus = new HocuspocusProvider({
      url: wsUrl,
      name: documentId,
      document: ydoc,
      token: token || "",
      onConnect: () => {
        setSyncState("connected");
      },
      onStatus: (data) => {
        if (data.status === "connected") {
          setSyncState("connected");
        } else if (data.status === "connecting") {
          setSyncState("syncing");
        } else {
          setSyncState("offline");
        }
      },
      onSynced: () => {
        setIsReady(true);
      },
      onAuthenticationFailed: () => {
        setSyncState("error");
      },
      onClose: () => {
        setSyncState("offline");
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
  }, [documentId, token, ydoc]);

  return {
    ydoc,
    provider,
    syncState,
    isReady,
  };
}
