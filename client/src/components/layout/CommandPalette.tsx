import React, { useState, useEffect } from "react";
import { DocumentItem } from "../../lib/api.js";
import { useTheme } from "../../context/ThemeContext.js";
import {
  MagnifyingGlass,
  Plus,
  Sun,
  Moon,
  ShareNetwork,
  ClockCounterClockwise,
  FileText,
} from "@phosphor-icons/react";

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  documents: DocumentItem[];
  onSelectDoc: (id: string) => void;
  onCreateDoc: () => void;
  onOpenShare: () => void;
  onOpenHistory: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  documents,
  onSelectDoc,
  onCreateDoc,
  onOpenShare,
  onOpenHistory,
}) => {
  const [query, setQuery] = useState("");
  const { toggleTheme, theme } = useTheme();
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        if (isOpen) onClose();
        else setQuery("");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const filteredDocs = documents.filter((doc) =>
    doc.title.toLowerCase().includes(query.toLowerCase())
  );

  const actions = [
    {
      id: "action-new-doc",
      title: "Create New Document",
      icon: <Plus size={16} />,
      execute: () => {
        onCreateDoc();
        onClose();
      },
    },
    {
      id: "action-toggle-theme",
      title: `Switch to ${theme === "dark" ? "Light" : "Dark"} Theme`,
      icon: theme === "dark" ? <Sun size={16} /> : <Moon size={16} />,
      execute: () => {
        toggleTheme();
        onClose();
      },
    },
    {
      id: "action-share",
      title: "Share Current Document",
      icon: <ShareNetwork size={16} />,
      execute: () => {
        onOpenShare();
        onClose();
      },
    },
    {
      id: "action-history",
      title: "View Version History",
      icon: <ClockCounterClockwise size={16} />,
      execute: () => {
        onOpenHistory();
        onClose();
      },
    },
  ];

  const totalItems = filteredDocs.length + actions.length;

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    if (!isOpen) return;

    const handleNav = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % totalItems);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + totalItems) % totalItems);
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (selectedIndex < filteredDocs.length) {
          onSelectDoc(filteredDocs[selectedIndex].id);
          onClose();
        } else {
          const actionIndex = selectedIndex - filteredDocs.length;
          actions[actionIndex]?.execute();
        }
      } else if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleNav);
    return () => window.removeEventListener("keydown", handleNav);
  }, [isOpen, selectedIndex, totalItems, filteredDocs, actions, onSelectDoc, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 p-4">
      {/* Backdrop */}
      <div onClick={onClose} className="fixed inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Command Palette Card */}
      <div className="relative w-full max-w-xl rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl shadow-black/50 overflow-hidden flex flex-col z-10 animate-slide-down">
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-zinc-100 dark:border-zinc-800">
          <MagnifyingGlass size={18} className="text-zinc-400 shrink-0" />
          <input
            type="text"
            placeholder="Type a command or search documents..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
            className="w-full bg-transparent text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-500 focus:outline-none"
          />
          <kbd className="text-[10px] bg-zinc-100 dark:bg-zinc-800 text-zinc-500 px-1.5 py-0.5 rounded border border-zinc-300 dark:border-zinc-700 font-mono">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto p-2 flex flex-col gap-1">
          {filteredDocs.length > 0 && (
            <div className="flex flex-col gap-0.5 mb-2">
              <div className="px-2 py-1 text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
                Documents
              </div>
              {filteredDocs.map((doc, idx) => (
                <button
                  key={doc.id}
                  onClick={() => {
                    onSelectDoc(doc.id);
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-left transition-colors ${
                    selectedIndex === idx
                      ? "bg-brand-500/10 text-brand-400 font-medium"
                      : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/60"
                  }`}
                >
                  <span className="text-sm">{doc.icon || "📝"}</span>
                  <span className="truncate flex-1">{doc.title}</span>
                  <FileText size={14} className="text-zinc-500" />
                </button>
              ))}
            </div>
          )}

          <div className="flex flex-col gap-0.5">
            <div className="px-2 py-1 text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
              Actions
            </div>
            {actions.map((act, idx) => {
              const itemIdx = filteredDocs.length + idx;
              return (
                <button
                  key={act.id}
                  onClick={act.execute}
                  onMouseEnter={() => setSelectedIndex(itemIdx)}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-left transition-colors ${
                    selectedIndex === itemIdx
                      ? "bg-brand-500/10 text-brand-400 font-medium"
                      : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/60"
                  }`}
                >
                  <div className="p-1 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500">
                    {act.icon}
                  </div>
                  <span className="flex-1">{act.title}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
