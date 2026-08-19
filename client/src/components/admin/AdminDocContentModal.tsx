import React, { useState, useEffect } from "react";
import { Modal } from "../ui/Modal.js";
import { Button } from "../ui/Button.js";
import { api, AdminDocumentItem } from "../../lib/api.js";
import { ShieldCheck, ShieldWarning, FloppyDisk, ArrowClockwise, FileText } from "@phosphor-icons/react";

interface AdminDocContentModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: AdminDocumentItem | null;
  onContentSaved?: () => void;
}

export const AdminDocContentModal: React.FC<AdminDocContentModalProps> = ({
  isOpen,
  onClose,
  document,
  onContentSaved,
}) => {
  const [content, setContent] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadContent = async () => {
    if (!document) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.admin.getDocumentAudit(document.id);
      setContent(res.audit.currentContentText || "");
    } catch (err: any) {
      setError(err.message || "Failed to load document content");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && document) {
      loadContent();
    }
  }, [isOpen, document?.id]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!document) return;
    setIsSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await api.admin.updateDocumentContent(document.id, content);
      setSuccess("Document content updated and new snapshot recorded");
      setTimeout(() => setSuccess(null), 3500);
      if (onContentSaved) onContentSaved();
    } catch (err: any) {
      setError(err.message || "Failed to update document content");
    } finally {
      setIsSaving(false);
    }
  };

  if (!document) return null;

  const charCount = content.length;
  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Inspect & Edit Content — ${document.icon || "📝"} ${document.title}`}
      description="Directly inspect, modify, or inject text into this CRDT document and generate an immediate version checkpoint."
      maxWidth="xl"
    >
      <form onSubmit={handleSave} className="flex flex-col gap-4">
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

        {/* Top bar info */}
        <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 border-b border-zinc-200 dark:border-zinc-800 pb-2">
          <div className="flex items-center gap-3">
            <span className="font-mono">Owner: {document.owner.name}</span>
            <span>•</span>
            <span className="font-mono">{wordCount} words ({charCount} chars)</span>
          </div>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={loadContent}
            isLoading={isLoading}
            className="text-xs gap-1"
          >
            <ArrowClockwise size={13} />
            <span>Reload</span>
          </Button>
        </div>

        {/* Content Area */}
        <div className="relative">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            disabled={isLoading}
            placeholder="Document content is empty. Type here to add text..."
            rows={12}
            className="w-full p-4 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs sm:text-sm font-mono text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-rose-500/40 resize-y leading-relaxed"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-2">
          <span className="text-[11px] text-zinc-400 font-mono">
            Saving will compile text into Y.Doc & increment snapshot version.
          </span>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Close
            </Button>
            <Button type="submit" variant="primary" isLoading={isSaving} className="gap-1.5 bg-rose-600 hover:bg-rose-500 text-white">
              <FloppyDisk size={16} weight="bold" />
              <span>Save & Create Snapshot</span>
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
};
