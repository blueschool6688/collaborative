import React, { useState, useEffect } from "react";
import { DocumentItem } from "../../lib/api.js";
import { useAuth } from "../../context/AuthContext.js";
import { useTheme } from "../../context/ThemeContext.js";
import { CollaboratorUser } from "../../hooks/useAwareness.js";
import { SyncState } from "../../hooks/useCollaboration.js";
import { Button } from "../ui/Button.js";
import { Badge } from "../ui/Badge.js";
import { Avatar } from "../ui/Avatar.js";
import {
  ShareNetwork,
  ClockCounterClockwise,
  Sun,
  Moon,
  SignIn,
  SignOut,
  Sidebar as SidebarIcon,
  ShieldCheck,
} from "@phosphor-icons/react";

interface HeaderProps {
  document: DocumentItem | null;
  syncState: SyncState;
  collaborators: CollaboratorUser[];
  onTitleChange: (newTitle: string) => void;
  onOpenShare: () => void;
  onOpenHistory: () => void;
  onOpenAuth: () => void;
  onOpenAdmin?: () => void;
  onToggleSidebar: () => void;
  isSidebarOpen: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  document,
  syncState,
  collaborators,
  onTitleChange,
  onOpenShare,
  onOpenHistory,
  onOpenAuth,
  onOpenAdmin,
  onToggleSidebar,
}) => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [title, setTitle] = useState(document?.title || "Untitled Document");
  const [isEditingTitle, setIsEditingTitle] = useState(false);

  useEffect(() => {
    if (document) {
      setTitle(document.title);
    }
  }, [document?.title]);

  const handleTitleSubmit = () => {
    setIsEditingTitle(false);
    if (title.trim() && title !== document?.title) {
      onTitleChange(title.trim());
    } else if (document) {
      setTitle(document.title);
    }
  };

  const getSyncBadge = () => {
    switch (syncState) {
      case "connected":
        return (
          <Badge variant="success" dot size="sm">
            Saved
          </Badge>
        );
      case "syncing":
        return (
          <Badge variant="warning" dot size="sm">
            Syncing
          </Badge>
        );
      case "offline":
        return (
          <Badge variant="neutral" dot size="sm">
            Offline
          </Badge>
        );
      case "error":
        return (
          <Badge variant="danger" dot size="sm">
            Restricted
          </Badge>
        );
    }
  };

  const isAdmin = user?.systemRole === "ADMIN";

  return (
    <header className="h-14 border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md px-3 sm:px-4 flex items-center justify-between shrink-0 z-20">
      {/* Left section: Sidebar toggle, breadcrumb, editable title */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
        <button
          onClick={onToggleSidebar}
          className="p-1.5 sm:p-2 rounded-lg text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors shrink-0"
          title="Toggle Sidebar"
        >
          <SidebarIcon size={18} />
        </button>

        {document && (
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            <span className="text-base select-none shrink-0">{document.icon || "📝"}</span>

            {isEditingTitle ? (
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={handleTitleSubmit}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleTitleSubmit();
                  if (e.key === "Escape") {
                    setTitle(document.title);
                    setIsEditingTitle(false);
                  }
                }}
                autoFocus
                className="bg-transparent text-xs sm:text-sm font-semibold text-zinc-900 dark:text-zinc-100 border-b border-brand-500 focus:outline-none px-0.5 py-0 max-w-[140px] sm:max-w-[240px]"
              />
            ) : (
              <h1
                onClick={() => {
                  if (document.userRole === "OWNER" || document.userRole === "EDITOR") {
                    setIsEditingTitle(true);
                  }
                }}
                className="text-xs sm:text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800/60 px-1 sm:px-1.5 py-0.5 rounded transition-colors max-w-[130px] sm:max-w-[260px]"
                title="Click to rename"
              >
                {document.title}
              </h1>
            )}

            <div className="shrink-0">{getSyncBadge()}</div>
          </div>
        )}
      </div>

      {/* Right section: Collaborators, Admin, Actions */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {/* Active Collaborators Presence Pile */}
        {collaborators.length > 0 && (
          <div className="hidden sm:flex items-center -space-x-1.5 mr-1">
            {collaborators.slice(0, 3).map((collab) => (
              <div
                key={collab.clientId}
                className="relative group"
                title={`${collab.name} ${collab.isSelf ? "(You)" : ""}`}
              >
                <Avatar
                  name={collab.name}
                  color={collab.color}
                  size="sm"
                  className="transition-transform group-hover:scale-110 group-hover:z-10 ring-2 ring-white dark:ring-zinc-950"
                />
                <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-500 ring-1 ring-zinc-950" />
              </div>
            ))}
            {collaborators.length > 3 && (
              <div className="w-6 h-6 rounded-full bg-zinc-200 dark:bg-zinc-800 ring-1 ring-zinc-950 text-zinc-600 dark:text-zinc-300 text-[10px] font-semibold flex items-center justify-center">
                +{collaborators.length - 3}
              </div>
            )}
          </div>
        )}

        {/* Super Admin Dashboard Trigger */}
        {isAdmin && onOpenAdmin && (
          <button
            onClick={onOpenAdmin}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 dark:text-rose-400 border border-rose-500/20 text-xs font-semibold transition-all shadow-sm"
            title="Open Super Admin Governance"
          >
            <ShieldCheck size={16} weight="fill" />
            <span className="hidden md:inline">Admin</span>
          </button>
        )}

        {/* Action Buttons */}
        {document && (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={onOpenHistory}
              className="gap-1.5 hidden md:inline-flex"
            >
              <ClockCounterClockwise size={15} />
              <span>History</span>
            </Button>

            <Button
              variant="primary"
              size="sm"
              onClick={onOpenShare}
              className="gap-1.5 h-8 px-2.5 sm:px-3 text-xs"
            >
              <ShareNetwork size={14} weight="bold" />
              <span className="hidden sm:inline">Share</span>
            </Button>
          </>
        )}

        <div className="w-px h-4 bg-zinc-200 dark:bg-zinc-800 mx-0.5 sm:mx-1" />

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="p-1.5 sm:p-2 rounded-lg text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          title={`Switch to ${theme === "dark" ? "Light" : "Dark"} mode`}
        >
          {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        {/* User Account / Auth */}
        {user ? (
          <div className="flex items-center gap-1.5 pl-0.5">
            <Avatar name={user.name} color={user.color} avatar={user.avatar} size="sm" />
            <button
              onClick={logout}
              className="p-1.5 sm:p-2 rounded-lg text-zinc-400 hover:text-rose-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              title="Sign Out"
            >
              <SignOut size={16} />
            </button>
          </div>
        ) : (
          <Button variant="secondary" size="sm" onClick={onOpenAuth} className="gap-1.5 h-8 text-xs">
            <SignIn size={14} />
            <span className="hidden sm:inline">Sign In</span>
          </Button>
        )}
      </div>
    </header>
  );
};
