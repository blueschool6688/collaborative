import React, { useState, useEffect } from "react";
import { Modal } from "../ui/Modal.js";
import { Button } from "../ui/Button.js";
import { Badge } from "../ui/Badge.js";
import { Avatar } from "../ui/Avatar.js";
import { api, DocumentAudit, AdminDocumentItem } from "../../lib/api.js";
import { formatBytes, formatDate } from "../../lib/utils.js";
import {
  ClockCounterClockwise,
  ListBullets,
  Users,
  ShieldCheck,
  ShieldWarning,
  ArrowClockwise,
  ArrowCounterClockwise,
  Eye,
} from "@phosphor-icons/react";

interface AdminDocHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: AdminDocumentItem | null;
  onVersionRestored?: () => void;
}

type HistoryTab = "snapshots" | "logs" | "permissions";

export const AdminDocHistoryModal: React.FC<AdminDocHistoryModalProps> = ({
  isOpen,
  onClose,
  document,
  onVersionRestored,
}) => {
  const [activeTab, setActiveTab] = useState<HistoryTab>("snapshots");
  const [audit, setAudit] = useState<DocumentAudit | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [previewSnapshot, setPreviewSnapshot] = useState<{ id: string; version: number; text: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadAudit = async () => {
    if (!document) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.admin.getDocumentAudit(document.id);
      setAudit(res.audit);
    } catch (err: any) {
      setError(err.message || "Failed to load history audit");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && document) {
      loadAudit();
      setPreviewSnapshot(null);
    }
  }, [isOpen, document?.id]);

  const handleRestore = async (snapshotId: string, version: number) => {
    if (!document) return;
    if (!window.confirm(`Are you sure you want to restore "${document.title}" back to version ${version}?`)) return;

    try {
      await api.admin.restoreDocumentSnapshot(document.id, snapshotId);
      setSuccess(`Document successfully restored to version ${version}`);
      setTimeout(() => setSuccess(null), 3500);
      loadAudit();
      if (onVersionRestored) onVersionRestored();
    } catch (err: any) {
      setError(err.message || "Failed to restore version");
    }
  };

  if (!document) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`History & Audit Logs — ${document.icon || "📝"} ${document.title}`}
      description="Inspect version snapshots, raw incremental Yjs update logs, and collaborator permission assignments."
      maxWidth="xl"
    >
      <div className="flex flex-col gap-4">
        {/* Navigation Tabs */}
        <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-2">
          <div className="flex gap-1.5">
            <button
              onClick={() => setActiveTab("snapshots")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === "snapshots"
                  ? "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30"
                  : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              }`}
            >
              <ClockCounterClockwise size={15} />
              <span>Snapshots Timeline ({audit?.snapshots.length || 0})</span>
            </button>

            <button
              onClick={() => setActiveTab("logs")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === "logs"
                  ? "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30"
                  : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              }`}
            >
              <ListBullets size={15} />
              <span>Incremental Logs ({audit?.updateLogs.length || 0})</span>
            </button>

            <button
              onClick={() => setActiveTab("permissions")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === "permissions"
                  ? "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30"
                  : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              }`}
            >
              <Users size={15} />
              <span>Access & Roles ({audit?.permissions.length || 0})</span>
            </button>
          </div>

          <Button size="sm" variant="ghost" onClick={loadAudit} isLoading={isLoading} className="text-xs gap-1">
            <ArrowClockwise size={13} />
            <span>Refresh</span>
          </Button>
        </div>

        {/* Notifications */}
        {success && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs flex items-center gap-2">
            <ShieldCheck size={16} />
            <span>{success}</span>
          </div>
        )}
        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
            <ShieldWarning size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* TAB 1: SNAPSHOTS TIMELINE */}
        {activeTab === "snapshots" && audit && (
          <div className="flex flex-col gap-3">
            {previewSnapshot && (
              <div className="p-3.5 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs flex flex-col gap-1.5">
                <div className="flex items-center justify-between font-semibold text-zinc-900 dark:text-zinc-100">
                  <span>Version {previewSnapshot.version} Text Preview</span>
                  <button
                    onClick={() => setPreviewSnapshot(null)}
                    className="text-[11px] text-zinc-400 hover:text-zinc-200"
                  >
                    Hide Preview
                  </button>
                </div>
                <p className="font-mono text-zinc-600 dark:text-zinc-300 whitespace-pre-wrap bg-white dark:bg-zinc-950 p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 max-h-36 overflow-y-auto">
                  {previewSnapshot.text || "(Empty document)"}
                </p>
              </div>
            )}

            <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden max-h-72 overflow-y-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-zinc-50 dark:bg-zinc-800/50 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider border-b border-zinc-200 dark:border-zinc-800">
                    <th className="p-2.5">Version</th>
                    <th className="p-2.5">Created By / Reason</th>
                    <th className="p-2.5">Size</th>
                    <th className="p-2.5">Timestamp</th>
                    <th className="p-2.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800/60 text-xs">
                  {audit.snapshots.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-4 text-center text-zinc-500">
                        No snapshot records found
                      </td>
                    </tr>
                  ) : (
                    audit.snapshots.map((s) => (
                      <tr key={s.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors">
                        <td className="p-2.5">
                          <Badge variant="brand" size="sm">
                            v{s.version}
                          </Badge>
                        </td>
                        <td className="p-2.5 text-zinc-700 dark:text-zinc-300 font-medium">
                          {s.createdBy || "Debounced Compaction"}
                        </td>
                        <td className="p-2.5 font-mono text-zinc-500">{formatBytes(s.size)}</td>
                        <td className="p-2.5 font-mono text-zinc-400 text-[11px]">{formatDate(s.createdAt)}</td>
                        <td className="p-2.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setPreviewSnapshot({ id: s.id, version: s.version, text: s.previewText })}
                              className="p-1 rounded text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                              title="Preview version text"
                            >
                              <Eye size={14} />
                            </button>
                            <button
                              onClick={() => handleRestore(s.id, s.version)}
                              className="px-2 py-1 rounded text-[11px] font-semibold text-rose-500 hover:bg-rose-500/10 transition-colors"
                              title="Restore document to this version"
                            >
                              Restore
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

        {/* TAB 2: INCREMENTAL DELTA LOGS */}
        {activeTab === "logs" && audit && (
          <div className="flex flex-col gap-2">
            <p className="text-[11px] text-zinc-500">
              Raw incremental Yjs clock sequence logs in <code className="text-zinc-300">document_update_logs</code> awaiting snapshot compaction.
            </p>
            <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden max-h-72 overflow-y-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-zinc-50 dark:bg-zinc-800/50 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider border-b border-zinc-200 dark:border-zinc-800">
                    <th className="p-2.5">Clock Sequence</th>
                    <th className="p-2.5">Delta Size</th>
                    <th className="p-2.5">Log Record ID</th>
                    <th className="p-2.5 text-right">Logged At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800/60 text-xs">
                  {audit.updateLogs.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-4 text-center text-zinc-500">
                        No pending uncompacted delta logs (Document is fully compacted into snapshots)
                      </td>
                    </tr>
                  ) : (
                    audit.updateLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors">
                        <td className="p-2.5 font-mono text-zinc-900 dark:text-zinc-100 font-bold">
                          Clock #{log.clock}
                        </td>
                        <td className="p-2.5 font-mono text-zinc-500">{formatBytes(log.sizeBytes)}</td>
                        <td className="p-2.5 font-mono text-[10px] text-zinc-400">{log.id}</td>
                        <td className="p-2.5 text-right font-mono text-[11px] text-zinc-400">
                          {formatDate(log.createdAt)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: ACCESS & PERMISSIONS AUDIT */}
        {activeTab === "permissions" && audit && (
          <div className="flex flex-col gap-3">
            <div className="p-3.5 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar name={audit.document.owner.name} color={audit.document.owner.color} size="sm" />
                <div>
                  <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                    {audit.document.owner.name} (Primary Owner)
                  </p>
                  <p className="text-[11px] text-zinc-500 font-mono">{audit.document.owner.email}</p>
                </div>
              </div>
              <Badge variant="brand" size="sm">
                OWNER
              </Badge>
            </div>

            <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden max-h-60 overflow-y-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-zinc-50 dark:bg-zinc-800/50 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider border-b border-zinc-200 dark:border-zinc-800">
                    <th className="p-2.5">Collaborator</th>
                    <th className="p-2.5">Assigned Role</th>
                    <th className="p-2.5 text-right">Granted Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800/60 text-xs">
                  {audit.permissions.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="p-4 text-center text-zinc-500">
                        No additional collaborators shared on this document
                      </td>
                    </tr>
                  ) : (
                    audit.permissions.map((p) => (
                      <tr key={p.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors">
                        <td className="p-2.5">
                          <div className="flex items-center gap-2">
                            <Avatar name={p.user.name} color={p.user.color} size="xs" />
                            <div>
                              <p className="font-semibold text-zinc-900 dark:text-zinc-100">{p.user.name}</p>
                              <p className="text-[10px] text-zinc-500 font-mono">{p.user.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-2.5">
                          <Badge variant={p.role === "EDITOR" ? "success" : "neutral"} size="sm">
                            {p.role}
                          </Badge>
                        </td>
                        <td className="p-2.5 text-right font-mono text-[11px] text-zinc-400">
                          {formatDate(p.createdAt)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end pt-2">
          <Button variant="outline" onClick={onClose}>
            Close Audit
          </Button>
        </div>
      </div>
    </Modal>
  );
};
