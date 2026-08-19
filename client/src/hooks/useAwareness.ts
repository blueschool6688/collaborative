import { useState, useEffect } from "react";
import { HocuspocusProvider } from "@hocuspocus/provider";

export interface CollaboratorUser {
  clientId: number;
  id: string;
  name: string;
  color: string;
  avatar?: string | null;
  isSelf: boolean;
}

export function useAwareness(provider: HocuspocusProvider | null) {
  const [collaborators, setCollaborators] = useState<CollaboratorUser[]>([]);

  useEffect(() => {
    if (!provider || !provider.awareness) {
      setCollaborators([]);
      return;
    }

    const awareness = provider.awareness;

    const updateStates = () => {
      const states = awareness.getStates();
      const userList: CollaboratorUser[] = [];
      const currentClientId = awareness.clientID;

      states.forEach((state: any, clientId: number) => {
        if (state && state.user) {
          userList.push({
            clientId,
            id: state.user.id || `user_${clientId}`,
            name: state.user.name || "Anonymous",
            color: state.user.color || "#6366f1",
            avatar: state.user.avatar,
            isSelf: clientId === currentClientId,
          });
        }
      });

      setCollaborators(userList);
    };

    updateStates();
    awareness.on("change", updateStates);

    return () => {
      awareness.off("change", updateStates);
    };
  }, [provider]);

  return { collaborators };
}
