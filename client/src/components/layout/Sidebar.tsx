import React from "react";
import { DocumentItem } from "../../lib/api.js";
import { useAuth } from "../../context/AuthContext.js";
import { Button } from "../ui/Button.js";
import { Badge } from "../ui/Badge.js";
import {
  Plus,
  MagnifyingGlass,
  FileText,
  Trash,
  Sparkle,
  Globe,
  Lock,
  X,
} from "@phosphor-icons/react";

interface SidebarProps {
  documents: DocumentItem[];
  activeDocId: string | null;
  onSelectDoc: (id: string) => void;
  onCreateDoc: () => void;
  onDeleteDoc: (id: string, e: React.MouseEvent) => void;
  onOpenSearch: () => void;
  isOpen: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  documents,
  activeDocId,
  onSelectDoc,
  onCreateDoc,
  onDeleteDoc,
  onOpenSearch,
  isOpen,
  onCloseMobile,
}) => {
  const { user } = useAuth();

  if (!isOpen) return null;

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      <div
        onClick={onCloseMobile}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden transition-opacity"
      />

      <aside className="fixed inset-y-0 left-0 z-50 w-72 md:relative md:z-30 md:w-64 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 flex flex-col h-full shrink-0 select-none transition-all shadow-2xl md:shadow-none">
        {/* Workspace Brand Header */}
        <div className="p-3.5 flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800/80">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-brand-600 flex items-center justify-center text-white shadow-sm shadow-brand-500/20">
              <Sparkle size={16} weight="fill" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
                SyncCraft
              </span>
              <span className="text-[10px] text-zinc-400 font-mono">CRDT Workspace</span>
            </div>
          </div>

          {/* Close button on mobile */}
          <button
            onClick={onCloseMobile}
            className="md:hidden p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <X size={16} />
          </button>
        </div>

        {/* Action Buttons: New Doc & Search */}
        <div className="p-3 flex flex-col gap-2">
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              onCreateDoc();
              if (onCloseMobile) onCloseMobile();
            }}
            className="w-full justify-start gap-2 shadow-sm shadow-brand-500/10"
          >
            <Plus size={15} weight="bold" />
            <span>New Document</span>
          </Button>

          <button
            onClick={onOpenSearch}
            className="flex items-center justify-between w-full px-2.5 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all"
          >
            <div className="flex items-center gap-2">
              <MagnifyingGlass size={14} />
              <span>Search docs...</span>
            </div>
            <kbd className="text-[10px] bg-zinc-200 dark:bg-zinc-800 text-zinc-500 px-1.5 py-0.5 rounded border border-zinc-300 dark:border-zinc-700 font-mono">
              ⌘K
            </kbd>
          </button>
        </div>

        {/* Document Tree Header */}
        <div className="px-3 pt-2 pb-1 flex items-center justify-between text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
          <span>Documents</span>
          <span className="text-[10px] bg-zinc-200 dark:bg-zinc-800 px-1.5 py-0.2 rounded-full font-mono text-zinc-500">
            {documents.length}
          </span>
        </div>

        {/* Documents List */}
        <div className="flex-1 overflow-y-auto px-2 py-1 flex flex-col gap-0.5">
          {documents.length === 0 ? (
            <div className="p-4 text-center text-xs text-zinc-500 flex flex-col items-center gap-2">
              <FileText size={24} className="text-zinc-400 dark:text-zinc-600" />
              <span>No documents yet. Create one to begin.</span>
            </div>
          ) : (
            documents.map((doc) => {
              const isActive = activeDocId === doc.id;
              const isOwner = doc.ownerId === user?.id;

              return (
                <div
                  key={doc.id}
                  onClick={() => {
                    onSelectDoc(doc.id);
                    if (onCloseMobile) onCloseMobile();
                  }}
                  className={`group flex items-center justify-between px-2.5 py-2 rounded-lg text-xs cursor-pointer transition-all ${
                    isActive
                      ? "bg-brand-500/10 text-brand-600 dark:text-brand-400 font-medium border border-brand-500/20"
                      : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900 border border-transparent"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className="text-sm shrink-0">{doc.icon || "📝"}</span>
                    <span className="truncate">{doc.title || "Untitled"}</span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 ml-1">
                    {doc.isPublic ? (
                      <span title="Public Document"><Globe size={12} className="text-zinc-400" /></span>
                    ) : (
                      <span title="Private Document"><Lock size={12} className="text-zinc-500" /></span>
                    )}

                    {doc.userRole !== "OWNER" && (
                      <Badge variant={doc.userRole === "EDITOR" ? "success" : "neutral"} size="sm">
                        {doc.userRole === "EDITOR" ? "Edit" : "View"}
                      </Badge>
                    )}

                    {isOwner && (
                      <button
                        onClick={(e) => onDeleteDoc(doc.id, e)}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded text-zinc-400 hover:text-rose-500 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-opacity"
                        title="Delete document"
                      >
                        <Trash size={13} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-zinc-200 dark:border-zinc-800/80 flex items-center justify-between text-[11px] text-zinc-400">
          <span className="font-mono">CRDT • Yjs + Postgres</span>
          <span className="w-2 h-2 rounded-full bg-emerald-500" title="Engine Online" />
        </div>
      </aside>
    </>
  );
};
