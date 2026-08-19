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
import { AdminLayout } from "./components/admin/AdminLayout.js";
import { AdminLoginPage } from "./components/admin/AdminLoginPage.js";
import { Button } from "./components/ui/Button.js";
import { Sparkle, Plus, LockKey, ShieldWarning } from "@phosphor-icons/react";

export function App() {
  const { user, token, isLoading: isAuthLoading } = useAuth();
  
  // Path Router State
  const [currentPath, setCurrentPath] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const p = window.location.pathname;
      if (p.startsWith("/admin/login")) return "/admin/login";
      if (p.startsWith("/admin")) return "/admin";
    }
    return "/";
  });

  const navigate = (path: string) => {
    setCurrentPath(path);
    if (typeof window !== "undefined") {
      window.history.pushState({}, "", path);
    }
  };

  useEffect(() => {
    const handlePopState = () => {
      const p = window.location.pathname;
      if (p.startsWith("/admin/login")) setCurrentPath("/admin/login");
      else if (p.startsWith("/admin")) setCurrentPath("/admin");
      else setCurrentPath("/");
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [activeDocId, setActiveDocId] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("doc") || null;
  });
  const [activeDoc, setActiveDoc] = useState<DocumentItem | null>(null);
  const [docError, setDocError] = useState<string | null>(null);
  const [isLoadingDoc, setIsLoadingDoc] = useState(false);

  // Responsive sidebar: open by default on desktop, closed by default on mobile screens
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    if (typeof window !== "undefined") {
      return window.innerWidth >= 768;
    }
    return true;
  });

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);

  // Sync activeDocId with URL query params when on workspace view
  useEffect(() => {
    if (currentPath === "/" && activeDocId) {
      const url = new URL(window.location.href);
      if (url.searchParams.get("doc") !== activeDocId) {
        url.searchParams.set("doc", activeDocId);
        window.history.replaceState({}, "", url.toString());
      }
    }
  }, [activeDocId, currentPath]);

  // Load documents list for authenticated user
  const loadDocuments = useCallback(async () => {
    if (!token) {
      setDocuments([]);
      return;
    }
    try {
      const res = await api.documents.list();
      setDocuments(res.documents);

      // If no activeDocId is set, default to first document
      setActiveDocId((prev) => {
        if (!prev && res.documents.length > 0) {
          return res.documents[0].id;
        }
        return prev;
      });
    } catch (err) {
      console.error("Failed to load documents:", err);
    }
  }, [token]);

  useEffect(() => {
    if (!isAuthLoading) {
      loadDocuments();
    }
  }, [isAuthLoading, loadDocuments]);

  // Load active document details when activeDocId or token changes
  useEffect(() => {
    let isCancelled = false;

    async function loadActiveDoc() {
      if (!activeDocId || currentPath !== "/") {
        setActiveDoc(null);
        setDocError(null);
        return;
      }

      setIsLoadingDoc(true);
      setDocError(null);

      try {
        const res = await api.documents.get(activeDocId);
        if (!isCancelled) {
          setActiveDoc(res.document);
          setDocError(null);
          // If document isn't in documents list yet (e.g. opened via shared link), add it
          setDocuments((prev) => {
            if (!prev.some((d) => d.id === res.document.id)) {
              return [res.document, ...prev];
            }
            return prev.map((d) => (d.id === res.document.id ? res.document : d));
          });
        }
      } catch (err: any) {
        if (!isCancelled) {
          console.warn("Could not load active doc:", err);
          setActiveDoc(null);
          setDocError(err.message || "Access denied or document not found");
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingDoc(false);
        }
      }
    }

    loadActiveDoc();

    return () => {
      isCancelled = true;
    };
  }, [activeDocId, token, currentPath]);

  // Initialize collaboration engine only when active document is loaded without error
  const isCollabEnabled = Boolean(activeDocId && !docError && activeDoc !== null && currentPath === "/");
  const { ydoc, provider, syncState, isReady } = useCollaboration(activeDocId, isCollabEnabled);
  const { collaborators } = useAwareness(provider);

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
      setDocError(null);
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
      <div className="h-screen w-screen flex items-center justify-center bg-zinc-950 text-zinc-400 font-sans">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-mono">Initializing SyncCraft Platform...</span>
        </div>
      </div>
    );
  }

  // ==========================================
  // ROUTE 1: Dedicated Admin Login (/admin/login)
  // ==========================================
  if (currentPath === "/admin/login") {
    return (
      <AdminLoginPage
        onSuccess={() => navigate("/admin")}
        onBackToWorkspace={() => navigate("/")}
      />
    );
  }

  // ==========================================
  // ROUTE 2: Dedicated Admin Portal (/admin)
  // ==========================================
  if (currentPath === "/admin") {
    // If not authenticated as admin, prompt Admin Login screen
    if (!user || user.systemRole !== "ADMIN") {
      return (
        <AdminLoginPage
          onSuccess={() => navigate("/admin")}
          onBackToWorkspace={() => navigate("/")}
        />
      );
    }

    return (
      <AdminLayout
        onBackToWorkspace={() => navigate("/")}
        onOpenDocInWorkspace={(docId) => {
          setActiveDocId(docId);
          setDocError(null);
          navigate("/");
        }}
      />
    );
  }

  // ==========================================
  // ROUTE 3: Main Collaborative Workspace (/)
  // ==========================================
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans">
      {/* Sidebar Navigation */}
      <Sidebar
        documents={documents}
        activeDocId={activeDocId}
        onSelectDoc={(id) => {
          setActiveDocId(id);
          setDocError(null);
        }}
        onCreateDoc={handleCreateDocument}
        onDeleteDoc={handleDeleteDocument}
        onOpenSearch={() => setIsSearchModalOpen(true)}
        isOpen={isSidebarOpen}
        onCloseMobile={() => {
          if (window.innerWidth < 768) {
            setIsSidebarOpen(false);
          }
        }}
      />

      {/* Main Workspace Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Header Bar */}
        <Header
          document={activeDoc}
          syncState={docError ? "error" : syncState}
          collaborators={collaborators}
          onTitleChange={handleTitleChange}
          onOpenShare={() => setIsShareModalOpen(true)}
          onOpenHistory={() => setIsHistoryModalOpen(true)}
          onOpenAuth={() => setIsAuthModalOpen(true)}
          onOpenAdmin={() => navigate("/admin")}
          onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
          isSidebarOpen={isSidebarOpen}
        />

        {/* Editor or Error or Empty State */}
        <main className="flex-1 overflow-y-auto relative px-2 sm:px-4 md:px-6">
          {docError ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-4 py-8">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500 mb-4 shadow-lg shadow-rose-500/5">
                <ShieldWarning size={24} weight="fill" />
              </div>
              <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-1">
                Access Restricted
              </h2>
              <p className="text-xs text-zinc-500 max-w-sm mb-6 leading-relaxed">
                {docError}
              </p>
              {!user ? (
                <Button variant="primary" onClick={() => setIsAuthModalOpen(true)} className="gap-2">
                  <LockKey size={16} weight="bold" />
                  Sign In to Request Access
                </Button>
              ) : (
                <Button
                  variant="secondary"
                  onClick={() => {
                    if (documents.length > 0) setActiveDocId(documents[0].id);
                    else setActiveDocId(null);
                  }}
                >
                  Return to My Workspace
                </Button>
              )}
            </div>
          ) : isLoadingDoc ? (
            <div className="flex items-center justify-center h-full text-zinc-500 gap-2.5">
              <div className="w-4 h-4 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs font-mono">Loading document details...</span>
            </div>
          ) : activeDocId && activeDoc && provider && isReady ? (
            <CollaborativeEditor
              ydoc={ydoc}
              provider={provider}
              readOnly={activeDoc?.userRole === "VIEWER"}
            />
          ) : activeDocId && activeDoc && (!provider || !isReady) ? (
            <div className="flex items-center justify-center h-full text-zinc-500 gap-2.5">
              <div className="w-4 h-4 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs font-mono">Connecting & synchronizing CRDT replica...</span>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center px-4 py-8">
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
        onSelectDoc={(id) => {
          setActiveDocId(id);
          setDocError(null);
        }}
        onCreateDoc={handleCreateDocument}
        onOpenShare={() => setIsShareModalOpen(true)}
        onOpenHistory={() => setIsHistoryModalOpen(true)}
      />
    </div>
  );
}
