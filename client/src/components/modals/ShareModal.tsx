import React, { useState } from "react";
import { Modal } from "../ui/Modal.js";
import { Button } from "../ui/Button.js";
import { Input } from "../ui/Input.js";
import { Avatar } from "../ui/Avatar.js";
import { Badge } from "../ui/Badge.js";
import { api, DocumentItem } from "../../lib/api.js";
import { Link, Check, Globe, Trash, UserPlus } from "@phosphor-icons/react";

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: DocumentItem;
  onDocumentUpdated: (doc: DocumentItem) => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  document,
  onDocumentUpdated,
}) => {
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"VIEWER" | "EDITOR">("EDITOR");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const isOwner = document.userRole === "OWNER";

  const handleCopyLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleTogglePublic = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const isPublic = e.target.checked;
      const res = await api.documents.update(document.id, { isPublic });
      onDocumentUpdated(res.document);
    } catch (err: any) {
      setError(err.message || "Failed to update public access");
    }
  };

  const handleAddCollaborator = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await api.documents.addPermission(document.id, {
        email: inviteEmail.trim(),
        role: inviteRole,
      });
      setInviteEmail("");
      // Refresh doc
      const res = await api.documents.get(document.id);
      onDocumentUpdated(res.document);
    } catch (err: any) {
      setError(err.message || "Failed to add collaborator");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveCollaborator = async (targetUserId: string) => {
    try {
      await api.documents.removePermission(document.id, targetUserId);
      const res = await api.documents.get(document.id);
      onDocumentUpdated(res.document);
    } catch (err: any) {
      setError(err.message || "Failed to remove collaborator");
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Share Document"
      description="Collaborate in real-time by inviting teammates or sharing a link."
      maxWidth="lg"
    >
      <div className="flex flex-col gap-5">
        {error && (
          <div className="p-3 text-xs bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-lg">
            {error}
          </div>
        )}

        {/* Public Access Link Box */}
        <div className="p-3.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/60 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-md bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200">
                <Globe size={18} />
              </div>
              <div>
                <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                  Public Link Access
                </p>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  {document.isPublic
                    ? "Anyone with the link can view/edit this document"
                    : "Only invited users can access this document"}
                </p>
              </div>
            </div>
            {isOwner && (
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={document.isPublic}
                  onChange={handleTogglePublic}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-zinc-300 dark:bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand-600"></div>
              </label>
            )}
          </div>

          <div className="flex gap-2 items-center pt-1 border-t border-zinc-200 dark:border-zinc-700/40">
            <input
              type="text"
              readOnly
              value={window.location.href}
              className="flex-1 bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-300 text-xs px-3 py-1.5 rounded-md border border-zinc-200 dark:border-zinc-800 font-mono select-all focus:outline-none"
            />
            <Button
              size="sm"
              variant={copied ? "primary" : "secondary"}
              onClick={handleCopyLink}
              className="shrink-0 gap-1.5"
            >
              {copied ? <Check size={14} weight="bold" /> : <Link size={14} />}
              {copied ? "Copied" : "Copy Link"}
            </Button>
          </div>
        </div>

        {/* Add collaborator form (Owner only) */}
        {isOwner && (
          <form onSubmit={handleAddCollaborator} className="flex gap-2 items-end">
            <div className="flex-1">
              <Input
                label="Invite Teammate by Email"
                placeholder="colleague@company.com"
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                required
              />
            </div>
            <div className="w-32 flex flex-col gap-1.5">
              <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Role</label>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as "VIEWER" | "EDITOR")}
                className="w-full rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 px-2.5 py-2 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
              >
                <option value="EDITOR">Editor (Can edit)</option>
                <option value="VIEWER">Viewer (Read-only)</option>
              </select>
            </div>
            <Button type="submit" variant="primary" size="md" isLoading={isSubmitting} className="h-9">
              <UserPlus size={16} />
              Invite
            </Button>
          </form>
        )}

        {/* Collaborators List */}
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
            People with Access
          </p>

          <div className="divide-y divide-zinc-100 dark:divide-zinc-800 border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden max-h-48 overflow-y-auto">
            {/* Owner */}
            <div className="flex items-center justify-between p-2.5 bg-zinc-50/50 dark:bg-zinc-900/50">
              <div className="flex items-center gap-2.5">
                <Avatar
                  name={document.owner?.name || "Owner"}
                  color={document.owner?.color || "#6366f1"}
                  size="sm"
                />
                <div>
                  <p className="text-xs font-medium text-zinc-900 dark:text-zinc-100">
                    {document.owner?.name || "Document Owner"}
                  </p>
                  <p className="text-[11px] text-zinc-500">{document.owner?.email}</p>
                </div>
              </div>
              <Badge variant="brand" size="sm">
                Owner
              </Badge>
            </div>

            {/* Invited collaborators */}
            {document.permissions?.map((perm) => (
              <div
                key={perm.id}
                className="flex items-center justify-between p-2.5 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Avatar name={perm.user.name} color={perm.user.color} size="sm" />
                  <div>
                    <p className="text-xs font-medium text-zinc-900 dark:text-zinc-100">
                      {perm.user.name}
                    </p>
                    <p className="text-[11px] text-zinc-500">{perm.user.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={perm.role === "EDITOR" ? "success" : "neutral"} size="sm">
                    {perm.role === "EDITOR" ? "Editor" : "Viewer"}
                  </Badge>
                  {isOwner && (
                    <button
                      onClick={() => handleRemoveCollaborator(perm.userId)}
                      className="p-1 rounded text-zinc-400 hover:text-rose-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                      title="Remove access"
                    >
                      <Trash size={14} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
};
