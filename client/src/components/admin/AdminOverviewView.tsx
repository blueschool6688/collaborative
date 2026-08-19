import React, { useState, useEffect } from "react";
import { api, AdminStats } from "../../lib/api.js";
import { formatBytes, formatDate } from "../../lib/utils.js";
import { Badge } from "../ui/Badge.js";
import { Avatar } from "../ui/Avatar.js";
import { Button } from "../ui/Button.js";
import {
  Users,
  Files,
  ClockCounterClockwise,
  HardDrives,
  Cpu,
  Database,
  ArrowClockwise,
  Pulse,
  Sparkle,
} from "@phosphor-icons/react";

export const AdminOverviewView: React.FC = () => {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStats = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.admin.stats();
      setStats(res.stats);
    } catch (err: any) {
      setError(err.message || "Failed to load telemetry stats");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  if (isLoading && !stats) {
    return (
      <div className="flex items-center justify-center h-64 text-zinc-500 gap-2.5">
        <div className="w-5 h-5 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-mono">Fetching platform telemetry...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
        {error}
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="flex flex-col gap-6">
      {/* Header & Refresh */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Telemetry & Performance Dashboard</h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Real-time CRDT cluster health, storage compaction metrics, and active node utilization.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={loadStats} isLoading={isLoading} className="gap-1.5 text-xs">
          <ArrowClockwise size={14} />
          <span>Refresh Metrics</span>
        </Button>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400">
            <span className="text-xs font-medium">Total Registered Users</span>
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-500">
              <Users size={18} weight="fill" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">{stats.totalUsers}</span>
            <p className="text-[11px] text-emerald-500 font-mono mt-0.5">Active replicas & accounts</p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400">
            <span className="text-xs font-medium">Collaborative Docs</span>
            <div className="p-2 rounded-xl bg-brand-500/10 text-brand-500">
              <Files size={18} weight="fill" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">{stats.totalDocuments}</span>
            <p className="text-[11px] text-brand-500 font-mono mt-0.5">Yjs CRDT Document Rooms</p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400">
            <span className="text-xs font-medium">Compacted Snapshots</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
              <ClockCounterClockwise size={18} weight="fill" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">{stats.totalSnapshots}</span>
            <p className="text-[11px] text-zinc-400 font-mono mt-0.5">Debounced snapshot checkpoints</p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400">
            <span className="text-xs font-medium">Platform Storage</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
              <HardDrives size={18} weight="fill" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">{formatBytes(stats.totalStorageBytes)}</span>
            <p className="text-[11px] text-zinc-400 font-mono mt-0.5">PostgreSQL binary compressed</p>
          </div>
        </div>
      </div>

      {/* Cluster & Memory Utilization Banner */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-500">
                <Pulse size={20} weight="fill" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">CRDT Sync Engine</h3>
                <p className="text-[11px] text-zinc-500 font-mono">Hocuspocus WebSocket Gateway</p>
              </div>
            </div>
            <Badge variant="success" size="md">
              🟢 ONLINE
            </Badge>
          </div>

          <div className="flex flex-col gap-2.5 text-xs text-zinc-600 dark:text-zinc-400 font-mono">
            <div className="flex justify-between py-1 border-b border-zinc-100 dark:border-zinc-800/80">
              <span>Node.js Runtime:</span>
              <span className="font-semibold text-zinc-900 dark:text-zinc-200">{stats.nodeVersion}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-zinc-100 dark:border-zinc-800/80">
              <span>Server Uptime:</span>
              <span className="font-semibold text-zinc-900 dark:text-zinc-200">{Math.floor(stats.uptimeSeconds / 60)} minutes</span>
            </div>
            <div className="flex justify-between py-1">
              <span>Redis Cluster Scaling:</span>
              <span className="font-semibold text-emerald-500">Active (127.0.0.1:6379)</span>
            </div>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-brand-500/15 text-brand-500">
                <Cpu size={20} weight="fill" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Memory Allocation (V8)</h3>
                <p className="text-[11px] text-zinc-500 font-mono">Process memory profile</p>
              </div>
            </div>
            <span className="text-xs font-mono font-bold text-brand-500">{formatBytes(stats.memory.heapUsedBytes)} Used</span>
          </div>

          <div className="flex flex-col gap-2.5 text-xs text-zinc-600 dark:text-zinc-400 font-mono">
            <div className="flex justify-between py-1 border-b border-zinc-100 dark:border-zinc-800/80">
              <span>Resident Set Size (RSS):</span>
              <span className="font-semibold text-zinc-900 dark:text-zinc-200">{formatBytes(stats.memory.rssBytes)}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-zinc-100 dark:border-zinc-800/80">
              <span>V8 Heap Total:</span>
              <span className="font-semibold text-zinc-900 dark:text-zinc-200">{formatBytes(stats.memory.heapTotalBytes)}</span>
            </div>
            <div className="flex justify-between py-1">
              <span>Compaction Incremental Logs:</span>
              <span className="font-semibold text-zinc-900 dark:text-zinc-200">{stats.totalUpdateLogs} deltas</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity: Users & Documents */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Users */}
        <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Recent Users</h3>
            <span className="text-[11px] font-mono text-zinc-400">Latest registrations</span>
          </div>

          <div className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
            {stats.recentUsers.map((u) => (
              <div key={u.id} className="py-2.5 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5">
                  <Avatar name={u.name} color={u.color} size="sm" />
                  <div>
                    <p className="font-semibold text-zinc-900 dark:text-zinc-100">{u.name}</p>
                    <p className="text-[11px] text-zinc-500 font-mono">{u.email}</p>
                  </div>
                </div>
                <Badge variant={u.systemRole === "ADMIN" ? "brand" : "neutral"} size="sm">
                  {u.systemRole}
                </Badge>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Documents */}
        <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Recently Updated Documents</h3>
            <span className="text-[11px] font-mono text-zinc-400">Live active rooms</span>
          </div>

          <div className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
            {stats.recentDocuments.map((d) => (
              <div key={d.id} className="py-2.5 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-base shrink-0">{d.icon || "📝"}</span>
                  <div className="min-w-0">
                    <p className="font-semibold text-zinc-900 dark:text-zinc-100 truncate">{d.title}</p>
                    <p className="text-[11px] text-zinc-500 font-mono">By {d.owner?.name || "Unknown"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant={d.isPublic ? "success" : "neutral"} size="sm">
                    {d.isPublic ? "Public" : "Private"}
                  </Badge>
                  <span className="text-[11px] text-zinc-400 font-mono">{d.snapshotsCount} snaps</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
