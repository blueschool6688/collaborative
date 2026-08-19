import React, { useState, useEffect } from "react";
import { api, AdminDocumentItem, AdminUserItem } from "../../lib/api.js";
import { formatBytes, formatDate } from "../../lib/utils.js";
import { Button } from "../ui/Button.js";
import { Badge } from "../ui/Badge.js";
import { Input } from "../ui/Input.js";
import { Modal } from "../ui/Modal.js";
import { AdminDocContentModal } from "./AdminDocContentModal.js";
import { AdminDocHistoryModal } from "./AdminDocHistoryModal.js";
import {
  MagnifyingGlass,
  FilePlus,
  Trash,
  PencilSimple,
  ShieldCheck,
  ShieldWarning,
  ArrowClockwise,
  ClockCounterClockwise,
  FileText,
  ArrowSquareOut,
} from "@phosphor-icons/react";

interface AdminDocumentsViewProps {
  onOpenInWorkspace?: (docId: string) => void;
}

export const AdminDocumentsView: React.FC<AdminDocumentsViewProps> = ({ onOpenInWorkspace }) => {
  const [documents, setDocuments] = useState<AdminDocumentItem[]>([]);
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isContentOpen, setIsContentOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<AdminDocumentItem | null>(null);

  // Create Form State
  const [createTitle, setCreateTitle] = useState("");
  const [createIcon, setCreateIcon] = useState("📝");
  const [createOwnerId, setCreateOwnerId] = useState("");
  const [createIsPublic, setCreateIsPublic] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Edit Form State
  const [editTitle, setEditTitle] = useState("");
  const [editIcon, setEditIcon] = useState("📝");
  const [editOwnerId, setEditOwnerId] = useState("");
  const [editIsPublic, setEditIsPublic] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [docsRes, usersRes] = await Promise.all([
        api.admin.documents(query),
        api.admin.users(),
      ]);
      setDocuments(docsRes.documents);
      setUsers(usersRes.users);
      if (usersRes.users.length > 0 && !createOwnerId) {
        setCreateOwnerId(usersRes.users[0].id);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load document directory");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [query]);

  const showNotification = (msg: string) => {
    setActionSuccess(msg);
    setTimeout(() => setActionSuccess(null), 3500);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    setError(null);
    try {
      await api.admin.createDocument({
        title: createTitle,
        icon: createIcon,
        ownerId: createOwnerId || undefined,
        isPublic: createIsPublic,
      });
      showNotification(`Document "${createTitle}" created`);
      setIsCreateOpen(false);
      setCreateTitle("");
      loadData();
    } catch (err: any) {
      setError(err.message || "Failed to create document");
    } finally {
      setIsCreating(false);
    }
  };

  const handleOpenEdit = (doc: AdminDocumentItem) => {
    setSelectedDoc(doc);
    setEditTitle(doc.title);
    setEditIcon(doc.icon || "📝");
    setEditOwnerId(doc.owner.id);
    setEditIsPublic(doc.isPublic);
    setIsEditOpen(true);
  };

  const handleOpenContent = (doc: AdminDocumentItem) => {
    setSelectedDoc(doc);
    setIsContentOpen(true);
  };

  const handleOpenHistory = (doc: AdminDocumentItem) => {
    setSelectedDoc(doc);
    setIsHistoryOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoc) return;
    setIsUpdating(true);
    setError(null);
    try {
      await api.admin.updateDocument(selectedDoc.id, {
        title: editTitle,
        icon: editIcon,
        ownerId: editOwnerId,
        isPublic: editIsPublic,
      });
      showNotification(`Document "${editTitle}" updated`);
      setIsEditOpen(false);
      loadData();
    } catch (err: any) {
      setError(err.message || "Failed to update document");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteDocument = async (doc: AdminDocumentItem) => {
    if (!window.confirm(`Permanently purge document "${doc.title}" and its snapshots from the platform?`)) return;
    try {
      await api.admin.deleteDocument(doc.id);
      showNotification(`Document "${doc.title}" purged`);
      loadData();
    } catch (err: any) {
      setError(err.message || "Failed to delete document");
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Document Governance Module</h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Platform-wide directory, snapshot storage audit, ownership transfer, content management, and logs.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="primary" onClick={() => setIsCreateOpen(true)} className="gap-1.5 text-xs">
            <FilePlus size={15} weight="bold" />
            <span>Create Document</span>
          </Button>
          <Button size="sm" variant="outline" onClick={loadData} isLoading={isLoading} className="gap-1 text-xs">
            <ArrowClockwise size={14} />
          </Button>
        </div>
      </div>

      {/* Notifications */}
      {actionSuccess && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs flex items-center gap-2">
          <ShieldCheck size={16} />
          <span>{actionSuccess}</span>
        </div>
      )}
      {error && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
          <ShieldWarning size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Search Bar */}
      <div className="relative w-full">
        <MagnifyingGlass size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
        <input
          type="text"
          placeholder="Search document by title or owner email..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full pl-9 pr-4 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-rose-500/30"
        />
      </div>

      {/* Documents Table */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-50/70 dark:bg-zinc-800/40 text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider border-b border-zinc-200 dark:border-zinc-800">
                <th className="p-3.5">Document Title</th>
                <th className="p-3.5">Owner</th>
                <th className="p-3.5">Size & Version</th>
                <th className="p-3.5">Access</th>
                <th className="p-3.5">Last Updated</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60 text-xs">
              {documents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-zinc-500">
                    No documents matching the query
                  </td>
                </tr>
              ) : (
                documents.map((d) => (
                  <tr key={d.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors">
                    <td className="p-3.5">
                      <div className="flex items-center gap-2.5">
                        <span className="text-lg shrink-0">{d.icon || "📝"}</span>
                        <div>
                          <p className="font-semibold text-zinc-900 dark:text-zinc-100 truncate max-w-xs">{d.title}</p>
                          <p className="text-[10px] text-zinc-400 font-mono">ID: {d.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-3.5">
                      <div>
                        <p className="font-medium text-zinc-900 dark:text-zinc-100">{d.owner?.name || "Unknown"}</p>
                        <p className="text-[11px] text-zinc-500 font-mono">{d.owner?.email}</p>
                      </div>
                    </td>
                    <td className="p-3.5 text-[11px] font-mono text-zinc-500">
                      <span>{formatBytes(d.sizeBytes)}</span>
                      <span className="ml-1 text-zinc-400">(v{d.latestVersion} • {d.snapshotsCount} snaps)</span>
                    </td>
                    <td className="p-3.5">
                      <Badge variant={d.isPublic ? "success" : "neutral"} size="sm">
                        {d.isPublic ? "Public Web" : "Private"}
                      </Badge>
                    </td>
                    <td className="p-3.5 text-[11px] text-zinc-400 font-mono">{formatDate(d.updatedAt)}</td>
                    <td className="p-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {/* 1. Open in Live Workspace */}
                        {onOpenInWorkspace && (
                          <button
                            onClick={() => onOpenInWorkspace(d.id)}
                            className="p-1.5 rounded text-zinc-400 hover:text-brand-500 hover:bg-brand-500/10 transition-colors"
                            title="Open & Edit Live in Collaborative Workspace"
                          >
                            <ArrowSquareOut size={15} />
                          </button>
                        )}

                        {/* 2. Quick Edit Content */}
                        <button
                          onClick={() => handleOpenContent(d)}
                          className="p-1.5 rounded text-zinc-400 hover:text-indigo-500 hover:bg-indigo-500/10 transition-colors"
                          title="Inspect & Quick Edit Content Text"
                        >
                          <FileText size={15} />
                        </button>

                        {/* 3. History & Audit Logs */}
                        <button
                          onClick={() => handleOpenHistory(d)}
                          className="p-1.5 rounded text-zinc-400 hover:text-emerald-500 hover:bg-emerald-500/10 transition-colors"
                          title="View Snapshots Timeline & Delta Logs"
                        >
                          <ClockCounterClockwise size={15} />
                        </button>

                        {/* 4. Edit Metadata / Transfer Owner */}
                        <button
                          onClick={() => handleOpenEdit(d)}
                          className="p-1.5 rounded text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                          title="Edit Document Settings"
                        >
                          <PencilSimple size={15} />
                        </button>

                        {/* 5. Force Purge */}
                        <button
                          onClick={() => handleDeleteDocument(d)}
                          className="p-1.5 rounded text-zinc-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                          title="Force Purge Document"
                        >
                          <Trash size={15} />
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

      {/* CREATE DOCUMENT MODAL */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Create Workspace Document"
        description="Initialize a new CRDT document and assign ownership."
      >
        <form onSubmit={handleCreateSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-4 gap-3">
            <div className="col-span-1">
              <Input
                label="Icon"
                placeholder="📝"
                value={createIcon}
                onChange={(e) => setCreateIcon(e.target.value)}
                maxLength={4}
              />
            </div>
            <div className="col-span-3">
              <Input
                label="Document Title"
                placeholder="e.g. Infrastructure Architecture 2026"
                value={createTitle}
                onChange={(e) => setCreateTitle(e.target.value)}
                required
                autoFocus
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
              Assign Document Owner
            </label>
            <select
              value={createOwnerId}
              onChange={(e) => setCreateOwnerId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-900 dark:text-zinc-100"
            >
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.email})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="createIsPublic"
              checked={createIsPublic}
              onChange={(e) => setCreateIsPublic(e.target.checked)}
              className="rounded border-zinc-300 text-rose-600 focus:ring-rose-500"
            />
            <label htmlFor="createIsPublic" className="text-xs text-zinc-700 dark:text-zinc-300">
              Make document publicly accessible via shareable link
            </label>
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isCreating}>
              Create Document
            </Button>
          </div>
        </form>
      </Modal>

      {/* EDIT DOCUMENT MODAL */}
      <Modal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        title="Edit Document Metadata"
        description="Modify title, icon, access permissions, or transfer ownership."
      >
        <form onSubmit={handleEditSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-4 gap-3">
            <div className="col-span-1">
              <Input
                label="Icon"
                value={editIcon}
                onChange={(e) => setEditIcon(e.target.value)}
                maxLength={4}
              />
            </div>
            <div className="col-span-3">
              <Input
                label="Document Title"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
              Transfer Ownership To
            </label>
            <select
              value={editOwnerId}
              onChange={(e) => setEditOwnerId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-900 dark:text-zinc-100"
            >
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.email})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="editIsPublic"
              checked={editIsPublic}
              onChange={(e) => setEditIsPublic(e.target.checked)}
              className="rounded border-zinc-300 text-rose-600 focus:ring-rose-500"
            />
            <label htmlFor="editIsPublic" className="text-xs text-zinc-700 dark:text-zinc-300">
              Make document publicly accessible via shareable link
            </label>
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isUpdating}>
              Save Document Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* QUICK CONTENT INSPECTOR & EDITOR MODAL */}
      <AdminDocContentModal
        isOpen={isContentOpen}
        onClose={() => setIsContentOpen(false)}
        document={selectedDoc}
        onContentSaved={loadData}
      />

      {/* HISTORY & AUDIT LOGS MODAL */}
      <AdminDocHistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        document={selectedDoc}
        onVersionRestored={loadData}
      />
    </div>
  );
};
