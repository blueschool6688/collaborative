import React, { useState, useEffect } from "react";
import { Modal } from "../ui/Modal.js";
import { Button } from "../ui/Button.js";
import { Avatar } from "../ui/Avatar.js";
import { Badge } from "../ui/Badge.js";
import { api, AdminStats, AdminUserItem, AdminDocumentItem } from "../../lib/api.js";
import { formatBytes } from "../../lib/utils.js";
import {
  ChartBar,
  Users,
  Files,
  Pulse,
  Trash,
  ShieldCheck,
  ShieldWarning,
  MagnifyingGlass,
  Cpu,
  Database,
  ArrowClockwise,
} from "@phosphor-icons/react";

interface AdminDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabType = "overview" | "users" | "documents" | "telemetry";

export const AdminDashboardModal: React.FC<AdminDashboardModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [documents, setDocuments] = useState<AdminDocumentItem[]>([]);
  const [userQuery, setUserQuery] = useState("");
  const [docQuery, setDocQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      if (activeTab === "overview" || activeTab === "telemetry") {
        const res = await api.admin.stats();
        setStats(res.stats);
      } else if (activeTab === "users") {
        const res = await api.admin.users(userQuery);
        setUsers(res.users);
      } else if (activeTab === "documents") {
        const res = await api.admin.documents(docQuery);
        setDocuments(res.documents);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load admin data");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, activeTab]);

  const handleRoleToggle = async (userId: string, currentRole: "USER" | "ADMIN") => {
    const newRole = currentRole === "ADMIN" ? "USER" : "ADMIN";
    try {
      await api.admin.updateUserRole(userId, newRole);
      setActionMessage(`Role updated to ${newRole}`);
      setTimeout(() => setActionMessage(null), 3000);
      loadData();
    } catch (err: any) {
      setError(err.message || "Failed to update role");
    }
  };

  const handleDeleteUser = async (userId: string, email: string) => {
    if (!window.confirm(`Are you sure you want to permanently delete user "${email}" and their data?`)) return;
    try {
      await api.admin.deleteUser(userId);
      setActionMessage(`User ${email} deleted`);
      setTimeout(() => setActionMessage(null), 3000);
      loadData();
    } catch (err: any) {
      setError(err.message || "Failed to delete user");
    }
  };

  const handleDeleteDoc = async (docId: string, title: string) => {
    if (!window.confirm(`Are you sure you want to purge document "${title}" from the platform?`)) return;
    try {
      await api.admin.deleteDocument(docId);
      setActionMessage(`Document "${title}" purged`);
      setTimeout(() => setActionMessage(null), 3000);
      loadData();
    } catch (err: any) {
      setError(err.message || "Failed to delete document");
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="System Governance & Observability"
      description="Super Admin platform telemetry, real-time KPI metrics, and data governance."
      maxWidth="xl"
    >
      <div className="flex flex-col gap-5">
        {/* Navigation Tabs */}
        <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-2">
          <div className="flex gap-1.5 overflow-x-auto">
            <button
              onClick={() => setActiveTab("overview")}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === "overview"
                  ? "bg-brand-500/15 text-brand-600 dark:text-brand-400 border border-brand-500/30"
                  : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/60"
              }`}
            >
              <ChartBar size={16} />
              Overview
            </button>
            <button
              onClick={() => setActiveTab("users")}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === "users"
                  ? "bg-brand-500/15 text-brand-600 dark:text-brand-400 border border-brand-500/30"
                  : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/60"
              }`}
            >
              <Users size={16} />
              Users
            </button>
            <button
              onClick={() => setActiveTab("documents")}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === "documents"
                  ? "bg-brand-500/15 text-brand-600 dark:text-brand-400 border border-brand-500/30"
                  : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/60"
              }`}
            >
              <Files size={16} />
              Documents
            </button>
            <button
              onClick={() => setActiveTab("telemetry")}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === "telemetry"
                  ? "bg-brand-500/15 text-brand-600 dark:text-brand-400 border border-brand-500/30"
                  : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/60"
              }`}
            >
              <Pulse size={16} />
              Telemetry
            </button>
          </div>

          <Button size="sm" variant="ghost" onClick={loadData} isLoading={isLoading} className="gap-1 text-xs">
            <ArrowClockwise size={14} />
            Refresh
          </Button>
        </div>

        {/* Notifications & Error alerts */}
        {error && (
          <div className="p-3 text-xs bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-lg flex items-center gap-2">
            <ShieldWarning size={16} />
            {error}
          </div>
        )}
        {actionMessage && (
          <div className="p-3 text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg flex items-center gap-2">
            <ShieldCheck size={16} />
            {actionMessage}
          </div>
        )}

        {/* TAB 1: OVERVIEW */}
        {activeTab === "overview" && stats && (
          <div className="flex flex-col gap-4">
            {/* KPI Stat Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex flex-col">
                <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">Total Users</span>
                <span className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mt-1">{stats.totalUsers}</span>
                <span className="text-[10px] text-emerald-500 mt-1 font-mono">Active accounts</span>
              </div>

              <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex flex-col">
                <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">Total Documents</span>
                <span className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mt-1">{stats.totalDocuments}</span>
                <span className="text-[10px] text-brand-500 mt-1 font-mono">CRDT Rooms</span>
              </div>

              <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex flex-col">
                <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">Snapshots</span>
                <span className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mt-1">{stats.totalSnapshots}</span>
                <span className="text-[10px] text-zinc-400 mt-1 font-mono">Debounced versions</span>
              </div>

              <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex flex-col">
                <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">Total Storage</span>
                <span className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mt-1">
                  {formatBytes(stats.totalStorageBytes)}
                </span>
                <span className="text-[10px] text-zinc-400 mt-1 font-mono">PostgreSQL payload</span>
              </div>
            </div>

            {/* Health & Engine Banner */}
            <div className="p-4 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-brand-500/20 text-brand-500">
                  <Cpu size={22} weight="fill" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                    CRDT Cluster State: {stats.systemHealth}
                  </h4>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    Node {stats.nodeVersion} • Uptime {Math.floor(stats.uptimeSeconds / 60)} mins • RAM Heap {formatBytes(stats.memory.heapUsedBytes)}
                  </p>
                </div>
              </div>
              <Badge variant="success" size="md">
                Live WS Synced
              </Badge>
            </div>
          </div>
        )}

        {/* TAB 2: USER GOVERNANCE */}
        {activeTab === "users" && (
          <div className="flex flex-col gap-3">
            <div className="relative">
              <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                placeholder="Search user by name or email..."
                value={userQuery}
                onChange={(e) => {
                  setUserQuery(e.target.value);
                  api.admin.users(e.target.value).then((res) => setUsers(res.users));
                }}
                className="w-full pl-9 pr-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
              />
            </div>

            <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden max-h-72 overflow-y-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-zinc-100/70 dark:bg-zinc-800/70 text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider border-b border-zinc-200 dark:border-zinc-800">
                    <th className="p-2.5">User</th>
                    <th className="p-2.5">Role</th>
                    <th className="p-2.5">Provider</th>
                    <th className="p-2.5">Docs</th>
                    <th className="p-2.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800/60 text-xs">
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-4 text-center text-zinc-500">
                        No users found
                      </td>
                    </tr>
                  ) : (
                    users.map((u) => (
                      <tr key={u.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors">
                        <td className="p-2.5">
                          <div className="flex items-center gap-2.5">
                            <Avatar name={u.name} color={u.color} avatar={u.avatar} size="sm" />
                            <div>
                              <p className="font-semibold text-zinc-900 dark:text-zinc-100">{u.name}</p>
                              <p className="text-[11px] text-zinc-500 font-mono">{u.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-2.5">
                          <Badge variant={u.systemRole === "ADMIN" ? "brand" : "neutral"} size="sm">
                            {u.systemRole}
                          </Badge>
                        </td>
                        <td className="p-2.5 text-[11px] font-mono capitalize text-zinc-500">{u.provider}</td>
                        <td className="p-2.5 text-[11px] text-zinc-500">{u.ownedDocsCount} owned</td>
                        <td className="p-2.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleRoleToggle(u.id, u.systemRole)}
                              className="px-2 py-1 rounded text-[11px] font-medium border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                            >
                              {u.systemRole === "ADMIN" ? "Demote" : "Promote Admin"}
                            </button>
                            <button
                              onClick={() => handleDeleteUser(u.id, u.email)}
                              className="p-1 rounded text-zinc-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                              title="Delete user"
                            >
                              <Trash size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: DOCUMENT GOVERNANCE */}
        {activeTab === "documents" && (
          <div className="flex flex-col gap-3">
            <div className="relative">
              <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                placeholder="Search document by title or owner..."
                value={docQuery}
                onChange={(e) => {
                  setDocQuery(e.target.value);
                  api.admin.documents(e.target.value).then((res) => setDocuments(res.documents));
                }}
                className="w-full pl-9 pr-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
              />
            </div>

            <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden max-h-72 overflow-y-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-zinc-100/70 dark:bg-zinc-800/70 text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider border-b border-zinc-200 dark:border-zinc-800">
                    <th className="p-2.5">Document</th>
                    <th className="p-2.5">Owner</th>
                    <th className="p-2.5">Size / Version</th>
                    <th className="p-2.5">Access</th>
                    <th className="p-2.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800/60 text-xs">
                  {documents.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-4 text-center text-zinc-500">
                        No documents found
                      </td>
                    </tr>
                  ) : (
                    documents.map((d) => (
                      <tr key={d.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors">
                        <td className="p-2.5">
                          <div className="flex items-center gap-2">
                            <span>{d.icon || "📝"}</span>
                            <span className="font-semibold text-zinc-900 dark:text-zinc-100 truncate max-w-[160px]">
                              {d.title}
                            </span>
                          </div>
                        </td>
                        <td className="p-2.5 text-[11px] text-zinc-500">{d.owner?.name || "Unknown"}</td>
                        <td className="p-2.5 text-[11px] font-mono text-zinc-500">
                          {formatBytes(d.sizeBytes)} (v{d.latestVersion})
                        </td>
                        <td className="p-2.5">
                          <Badge variant={d.isPublic ? "success" : "neutral"} size="sm">
                            {d.isPublic ? "Public" : "Private"}
                          </Badge>
                        </td>
                        <td className="p-2.5 text-right">
                          <button
                            onClick={() => handleDeleteDoc(d.id, d.title)}
                            className="p-1 rounded text-zinc-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                            title="Force delete document"
                          >
                            <Trash size={14} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: TELEMETRY & SYSTEM HEALTH */}
        {activeTab === "telemetry" && stats && (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex flex-col gap-2">
                <div className="flex items-center gap-2 text-zinc-900 dark:text-zinc-100 font-semibold text-xs">
                  <Database size={16} className="text-brand-500" />
                  Database Persistence Health
                </div>
                <div className="flex flex-col gap-1 text-[11px] text-zinc-500 dark:text-zinc-400 font-mono">
                  <div className="flex justify-between">
                    <span>Compacted Snapshots:</span>
                    <span className="text-zinc-900 dark:text-zinc-100">{stats.totalSnapshots} records</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Incremental Delta Logs:</span>
                    <span className="text-zinc-900 dark:text-zinc-100">{stats.totalUpdateLogs} entries</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Compaction Interval:</span>
                    <span className="text-emerald-500">3000ms Debounced</span>
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex flex-col gap-2">
                <div className="flex items-center gap-2 text-zinc-900 dark:text-zinc-100 font-semibold text-xs">
                  <Pulse size={16} className="text-emerald-500" />
                  Node.js Memory Utilization
                </div>
                <div className="flex flex-col gap-1 text-[11px] text-zinc-500 dark:text-zinc-400 font-mono">
                  <div className="flex justify-between">
                    <span>Process RSS:</span>
                    <span className="text-zinc-900 dark:text-zinc-100">{formatBytes(stats.memory.rssBytes)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>V8 Heap Total:</span>
                    <span className="text-zinc-900 dark:text-zinc-100">{formatBytes(stats.memory.heapTotalBytes)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>V8 Heap Used:</span>
                    <span className="text-emerald-500">{formatBytes(stats.memory.heapUsedBytes)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
