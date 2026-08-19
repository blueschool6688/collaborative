import React, { useState, useEffect } from "react";
import { Modal } from "../ui/Modal.js";
import { Button } from "../ui/Button.js";
import { Badge } from "../ui/Badge.js";
import { api, SnapshotItem } from "../../lib/api.js";
import { formatDate, formatBytes } from "../../lib/utils.js";
import { ClockCounterClockwise, ArrowCounterClockwise, Eye } from "@phosphor-icons/react";

interface VersionHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentId: string;
  onRestored: () => void;
}

export const VersionHistoryModal: React.FC<VersionHistoryModalProps> = ({
  isOpen,
  onClose,
  documentId,
  onRestored,
}) => {
  const [snapshots, setSnapshots] = useState<SnapshotItem[]>([]);
  const [selectedSnapshot, setSelectedSnapshot] = useState<SnapshotItem | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && documentId) {
      loadHistory();
    }
  }, [isOpen, documentId]);

  const loadHistory = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.history.list(documentId);
      setSnapshots(res.snapshots);
      if (res.snapshots.length > 0) {
        loadPreview(res.snapshots[0].id);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load snapshot history");
    } finally {
      setIsLoading(false);
    }
  };

  const loadPreview = async (snapshotId: string) => {
    try {
      const res = await api.history.preview(documentId, snapshotId);
      setSelectedSnapshot(res.snapshot);
    } catch (err: any) {
      console.error("Error previewing snapshot:", err);
    }
  };

  const handleRestore = async () => {
    if (!selectedSnapshot) return;
    setIsRestoring(true);
    setError(null);
    try {
      await api.history.restore(documentId, selectedSnapshot.id);
      onRestored();
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to restore version");
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Version History"
      description="Inspect previous snapshots and restore your document to any past revision."
      maxWidth="xl"
    >
      <div className="flex flex-col gap-4">
        {error && (
          <div className="p-3 text-xs bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-lg">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 min-h-[300px] max-h-[400px]">
          {/* Left Column: Timeline List */}
          <div className="md:col-span-2 flex flex-col gap-1.5 overflow-y-auto pr-1 border-r border-zinc-200 dark:border-zinc-800">
            {isLoading ? (
              <div className="flex items-center justify-center h-32 text-xs text-zinc-500">
                Loading history...
              </div>
            ) : snapshots.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-xs text-zinc-500">
                <ClockCounterClockwise size={24} className="mb-2 text-zinc-600" />
                No snapshots recorded yet
              </div>
            ) : (
              snapshots.map((snap, idx) => (
                <button
                  key={snap.id}
                  onClick={() => loadPreview(snap.id)}
                  className={`flex flex-col text-left p-2.5 rounded-lg text-xs transition-all ${
                    selectedSnapshot?.id === snap.id
                      ? "bg-brand-500/10 border border-brand-500/30 text-brand-300"
                      : "hover:bg-zinc-100 dark:hover:bg-zinc-800/50 text-zinc-700 dark:text-zinc-300 border border-transparent"
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                      Version {snap.version}
                    </span>
                    {idx === 0 && (
                      <Badge variant="brand" size="sm">
                        Current
                      </Badge>
                    )}
                  </div>
                  <span className="text-[11px] text-zinc-500 mt-0.5">
                    {formatDate(snap.createdAt)} • {formatBytes(snap.size)}
                  </span>
                  <span className="text-[10px] text-zinc-400 italic truncate mt-0.5">
                    By {snap.createdBy || "System Compaction"}
                  </span>
                </button>
              ))
            )}
          </div>

          {/* Right Column: Version Preview & Restore */}
          <div className="md:col-span-3 flex flex-col justify-between pl-2">
            {selectedSnapshot ? (
              <div className="flex flex-col h-full justify-between gap-3">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between pb-2 border-b border-zinc-200 dark:border-zinc-800">
                    <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                      <Eye size={14} />
                      <span>Previewing Version {selectedSnapshot.version}</span>
                    </div>
                    <span className="text-[11px] text-zinc-500">
                      {new Date(selectedSnapshot.createdAt).toLocaleString()}
                    </span>
                  </div>

                  <div className="p-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-y-auto max-h-56 text-xs text-zinc-700 dark:text-zinc-300 font-mono whitespace-pre-wrap leading-relaxed">
                    {selectedSnapshot.previewText || (
                      <span className="text-zinc-500 italic">No text content in this snapshot</span>
                    )}
                  </div>
                </div>

                <div className="flex justify-end pt-3 border-t border-zinc-200 dark:border-zinc-800">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleRestore}
                    isLoading={isRestoring}
                    className="gap-1.5"
                  >
                    <ArrowCounterClockwise size={14} weight="bold" />
                    Restore this Version
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-xs text-zinc-500">
                Select a version from the timeline to preview
              </div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};
