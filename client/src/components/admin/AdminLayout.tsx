import React, { useState } from "react";
import { useAuth } from "../../context/AuthContext.js";
import { useTheme } from "../../context/ThemeContext.js";
import { AdminOverviewView } from "./AdminOverviewView.js";
import { AdminUsersView } from "./AdminUsersView.js";
import { AdminDocumentsView } from "./AdminDocumentsView.js";
import { AdminSettingsView } from "./AdminSettingsView.js";
import { Avatar } from "../ui/Avatar.js";
import { Badge } from "../ui/Badge.js";
import {
  ChartBar,
  Users,
  Files,
  SlidersHorizontal,
  ShieldCheck,
  SignOut,
  Sun,
  Moon,
  ArrowLeft,
  Sidebar as SidebarIcon,
  X,
} from "@phosphor-icons/react";

interface AdminLayoutProps {
  onBackToWorkspace: () => void;
  onOpenDocInWorkspace: (docId: string) => void;
}

type AdminTab = "overview" | "users" | "documents" | "settings";

export const AdminLayout: React.FC<AdminLayoutProps> = ({ onBackToWorkspace, onOpenDocInWorkspace }) => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<AdminTab>("overview");
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const navItems = [
    { id: "overview" as AdminTab, label: "Telemetry & Overview", icon: ChartBar },
    { id: "users" as AdminTab, label: "User Governance", icon: Users },
    { id: "documents" as AdminTab, label: "Document Directory", icon: Files },
    { id: "settings" as AdminTab, label: "Settings & Flags", icon: SlidersHorizontal },
  ];

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans">
      {/* Mobile Drawer Backdrop */}
      {isMobileSidebarOpen && (
        <div
          onClick={() => setIsMobileSidebarOpen(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
        />
      )}

      {/* Admin Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 md:relative md:z-30 border-r border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/90 backdrop-blur-md flex flex-col h-full shrink-0 select-none transition-transform duration-200 ease-in-out ${
          isMobileSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        {/* Brand Header */}
        <div className="p-4 flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-rose-600 flex items-center justify-center text-white shadow-md shadow-rose-500/20">
              <ShieldCheck size={20} weight="fill" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
                SyncCraft Admin
              </span>
              <span className="text-[10px] text-rose-500 font-mono font-semibold">SUPER ADMIN PORTAL</span>
            </div>
          </div>

          <button
            onClick={() => setIsMobileSidebarOpen(false)}
            className="md:hidden p-1 rounded-lg text-zinc-400 hover:text-zinc-200"
          >
            <X size={16} />
          </button>
        </div>

        {/* Back to Workspace Button */}
        <div className="p-3">
          <button
            onClick={onBackToWorkspace}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-xl text-xs font-semibold text-zinc-600 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800/70 hover:bg-zinc-200 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100 transition-all shadow-sm"
          >
            <ArrowLeft size={15} />
            <span>Return to Workspace</span>
          </button>
        </div>

        {/* Navigation Menu */}
        <div className="px-3 py-2 flex flex-col gap-1 flex-1 overflow-y-auto">
          <span className="px-2 text-[10px] font-mono font-semibold uppercase tracking-wider text-zinc-400 mb-1">
            Functional Modules
          </span>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setIsMobileSidebarOpen(false);
                }}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 shadow-sm"
                    : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 hover:text-zinc-900 dark:hover:text-zinc-200"
                }`}
              >
                <Icon size={18} weight={isActive ? "fill" : "regular"} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-zinc-200 dark:border-zinc-800/80 flex items-center justify-between text-[11px] text-zinc-500">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-mono">Node v22 • Engine 100%</span>
          </div>
        </div>
      </aside>

      {/* Main Workspace Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Top Header */}
        <header className="h-14 border-b border-zinc-200 dark:border-zinc-800/80 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md px-4 flex items-center justify-between shrink-0 z-20">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileSidebarOpen(true)}
              className="md:hidden p-2 rounded-lg text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              <SidebarIcon size={18} />
            </button>

            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-zinc-400 hidden sm:inline">Admin /</span>
              <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 capitalize">
                {activeTab}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Badge variant="success" size="sm" dot>
              Cluster Synced
            </Badge>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              title={`Switch to ${theme === "dark" ? "Light" : "Dark"} mode`}
            >
              {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
            </button>

            {/* Admin User Info */}
            {user && (
              <div className="flex items-center gap-2 pl-2 border-l border-zinc-200 dark:border-zinc-800">
                <Avatar name={user.name} color={user.color} avatar={user.avatar} size="sm" />
                <div className="hidden sm:flex flex-col text-left">
                  <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 leading-none">{user.name}</span>
                  <span className="text-[10px] text-rose-500 font-mono leading-none mt-0.5">Super Admin</span>
                </div>
                <button
                  onClick={logout}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors ml-1"
                  title="Sign Out"
                >
                  <SignOut size={16} />
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Content View Area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 max-w-7xl w-full mx-auto">
          {activeTab === "overview" && <AdminOverviewView />}
          {activeTab === "users" && <AdminUsersView />}
          {activeTab === "documents" && <AdminDocumentsView onOpenInWorkspace={onOpenDocInWorkspace} />}
          {activeTab === "settings" && <AdminSettingsView />}
        </main>
      </div>
    </div>
  );
};
