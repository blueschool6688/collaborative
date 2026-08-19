import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "./context/AuthContext.js";
import { api, DocumentItem } from "./lib/api.js";
import { useCollaboration } from "./hooks/useCollaboration.js";
import { useAwareness } from "./hooks/useAwareness.js";
import { Sidebar } from "./components/layout/Sidebar.js";
import { Header } from "./components/layout/Header.js";
import { CommandPalette } from "./components/layout/CommandPalette.js";
import { CollaborativeEditor } from "./components/editor/CollaborativeEditor.js";
import { ShareModal } from "./components/modals/ShareModal.js";
import { VersionHistoryModal } from "./components/modals/VersionHistoryModal.js";
import { AuthModal } from "./components/modals/AuthModal.js";
import { Button } from "./components/ui/Button.js";
import { Sparkle, Plus, LockKey } from "@phosphor-icons/react";

export function App() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [activeDocId, setActiveDocId] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("doc") || null;
  });
  const [activeDoc, setActiveDoc] = useState<DocumentItem | null>(null);

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);

  // Initialize collaboration engine
  const { ydoc, provider, syncState, isReady } = useCollaboration(activeDocId);
  const { collaborators } = useAwareness(provider);

  // Sync activeDocId with URL query params
  useEffect(() => {
    if (activeDocId) {
      const url = new URL(window.location.href);
      url.searchParams.set("doc", activeDocId);
      window.history.replaceState({}, "", url.toString());
    }
  }, [activeDocId]);

  // Load documents list
  const loadDocuments = useCallback(async () => {
    try {
      if (!user) {
        // If guest has activeDocId in URL, load that specific document
        if (activeDocId) {
          try {
            const res = await api.documents.get(activeDocId);
            setActiveDoc(res.document);
            setDocuments([res.document]);
          } catch (e) {
            console.warn("Could not load guest document:", e);
          }
        }
        return;
      }

      const res = await api.documents.list();
      setDocuments(res.documents);

      if (res.documents.length > 0) {
        if (!activeDocId || !res.documents.some((d) => d.id === activeDocId)) {
          setActiveDocId(res.documents[0].id);
          setActiveDoc(res.documents[0]);
        } else {
          const current = res.documents.find((d) => d.id === activeDocId);
          if (current) setActiveDoc(current);
        }
      }
    } catch (err) {
      console.error("Failed to load documents:", err);
    }
  }, [user, activeDocId]);

  useEffect(() => {
    if (!isAuthLoading) {
      loadDocuments();
    }
  }, [user, isAuthLoading, loadDocuments]);

  // Load active doc details if selected
  useEffect(() => {
    async function loadActiveDoc() {
      if (!activeDocId) {
        setActiveDoc(null);
        return;
      }
      try {
        const res = await api.documents.get(activeDocId);
        setActiveDoc(res.document);
      } catch (err) {
        console.error("Error loading active doc:", err);
      }
    }
    loadActiveDoc();
  }, [activeDocId]);

  const handleCreateDocument = async () => {
    if (!user) {
      setIsAuthModalOpen(true);
      return;
    }

    try {
      const res = await api.documents.create({
        title: "Untitled Document",
        icon: "📝",
      });
      setDocuments((prev) => [res.document, ...prev]);
      setActiveDocId(res.document.id);
      setActiveDoc(res.document);
    } catch (err: any) {
      alert(err.message || "Failed to create document");
    }
  };

  const handleDeleteDocument = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this document?")) return;

    try {
      await api.documents.delete(id);
      setDocuments((prev) => prev.filter((d) => d.id !== id));
      if (activeDocId === id) {
        const remaining = documents.filter((d) => d.id !== id);
        if (remaining.length > 0) {
          setActiveDocId(remaining[0].id);
          setActiveDoc(remaining[0]);
        } else {
          setActiveDocId(null);
          setActiveDoc(null);
        }
      }
    } catch (err: any) {
      alert(err.message || "Failed to delete document");
    }
  };

  const handleTitleChange = async (newTitle: string) => {
    if (!activeDoc) return;
    try {
      const res = await api.documents.update(activeDoc.id, { title: newTitle });
      setActiveDoc(res.document);
      setDocuments((prev) => prev.map((d) => (d.id === activeDoc.id ? res.document : d)));
    } catch (err) {
      console.error("Failed to update title:", err);
    }
  };

  if (isAuthLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-zinc-950 text-zinc-400">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-mono">Initializing SyncCraft...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans">
      {/* Sidebar Navigation */}
      <Sidebar
        documents={documents}
        activeDocId={activeDocId}
        onSelectDoc={(id) => setActiveDocId(id)}
        onCreateDoc={handleCreateDocument}
        onDeleteDoc={handleDeleteDocument}
        onOpenSearch={() => setIsSearchModalOpen(true)}
        isOpen={isSidebarOpen}
      />

      {/* Main Workspace Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Header Bar */}
        <Header
          document={activeDoc}
          syncState={syncState}
          collaborators={collaborators}
          onTitleChange={handleTitleChange}
          onOpenShare={() => setIsShareModalOpen(true)}
          onOpenHistory={() => setIsHistoryModalOpen(true)}
          onOpenAuth={() => setIsAuthModalOpen(true)}
          onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
          isSidebarOpen={isSidebarOpen}
        />

        {/* Editor or Empty State */}
        <main className="flex-1 overflow-y-auto relative">
          {activeDocId && provider && isReady ? (
            <CollaborativeEditor
              ydoc={ydoc}
              provider={provider}
              readOnly={activeDoc?.userRole === "VIEWER"}
            />
          ) : activeDocId && (!provider || !isReady) ? (
            <div className="flex items-center justify-center h-full text-zinc-500 gap-2.5">
              <div className="w-4 h-4 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs font-mono">Connecting & synchronizing CRDT replica...</span>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <div className="w-12 h-12 rounded-2xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-500 mb-4 shadow-lg shadow-brand-500/5">
                <Sparkle size={24} weight="fill" />
              </div>
              <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-1">
                Welcome to SyncCraft
              </h2>
              <p className="text-xs text-zinc-500 max-w-sm mb-6 leading-relaxed">
                Experience instant conflict-free real-time collaborative editing with CRDT, Yjs, and
                PostgreSQL compaction snapshots.
              </p>
              {user ? (
                <Button variant="primary" onClick={handleCreateDocument} className="gap-2">
                  <Plus size={16} weight="bold" />
                  Create Your First Document
                </Button>
              ) : (
                <Button variant="primary" onClick={() => setIsAuthModalOpen(true)} className="gap-2">
                  <LockKey size={16} weight="bold" />
                  Sign In to Create Documents
                </Button>
              )}
            </div>
          )}
        </main>
      </div>

      {/* Modals & Dialogs */}
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />

      {activeDoc && (
        <ShareModal
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          document={activeDoc}
          onDocumentUpdated={(updated) => {
            setActiveDoc(updated);
            setDocuments((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
          }}
        />
      )}

      {activeDocId && (
        <VersionHistoryModal
          isOpen={isHistoryModalOpen}
          onClose={() => setIsHistoryModalOpen(false)}
          documentId={activeDocId}
          onRestored={() => {
            // Trigger refresh by updating state
            if (activeDocId) {
              api.documents.get(activeDocId).then((res) => setActiveDoc(res.document));
            }
          }}
        />
      )}

      <CommandPalette
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
        documents={documents}
        onSelectDoc={(id) => setActiveDocId(id)}
        onCreateDoc={handleCreateDocument}
        onOpenShare={() => setIsShareModalOpen(true)}
        onOpenHistory={() => setIsHistoryModalOpen(true)}
      />
    </div>
  );
}
