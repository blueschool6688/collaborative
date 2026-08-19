import React, { useState, useEffect } from "react";
import { api, SystemSettings } from "../../lib/api.js";
import { Button } from "../ui/Button.js";
import { Badge } from "../ui/Badge.js";
import {
  SlidersHorizontal,
  ShieldCheck,
  ShieldWarning,
  ArrowClockwise,
  FloppyDisk,
  WarningOctagon,
  Sparkle,
} from "@phosphor-icons/react";

export const AdminSettingsView: React.FC = () => {
  const [settings, setSettings] = useState<SystemSettings>({
    enableRegistration: true,
    enableGuestAccess: true,
    maintenanceMode: false,
    compactionIntervalMs: 3000,
    maxDocumentSizeMB: 50,
    allowPublicSharing: true,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadSettings = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.admin.getSettings();
      setSettings(res.settings);
    } catch (err: any) {
      setError(err.message || "Failed to load system settings");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await api.admin.updateSettings(settings);
      setSettings(res.settings);
      setSuccess("System feature flags and configurations updated successfully");
      setTimeout(() => setSuccess(null), 4000);
    } catch (err: any) {
      setError(err.message || "Failed to update settings");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">System Settings & Feature Flags</h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Control platform functional switches, access policies, and CRDT compaction runtime parameters.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={loadSettings} isLoading={isLoading} className="gap-1.5 text-xs">
          <ArrowClockwise size={14} />
          <span>Reset</span>
        </Button>
      </div>

      {/* Notifications */}
      {success && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs flex items-center gap-2">
          <ShieldCheck size={18} weight="fill" />
          <span>{success}</span>
        </div>
      )}
      {error && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
          <ShieldWarning size={18} weight="fill" />
          <span>{error}</span>
        </div>
      )}

      {/* Settings Form */}
      <form onSubmit={handleSave} className="flex flex-col gap-5">
        {/* Section 1: Authentication & Access Policies */}
        <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col gap-4">
          <div className="flex items-center gap-2 border-b border-zinc-100 dark:border-zinc-800/80 pb-3">
            <SlidersHorizontal size={18} className="text-rose-500" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-800 dark:text-zinc-200">
              Access & Security Governance
            </h3>
          </div>

          <div className="flex items-center justify-between py-2 border-b border-zinc-100 dark:border-zinc-800/60">
            <div>
              <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">Public Self-Service Registration</p>
              <p className="text-[11px] text-zinc-500">Allow visitors to register new accounts without admin invite.</p>
            </div>
            <input
              type="checkbox"
              checked={settings.enableRegistration}
              onChange={(e) => setSettings({ ...settings, enableRegistration: e.target.checked })}
              className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 border-zinc-300 dark:border-zinc-700 cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between py-2 border-b border-zinc-100 dark:border-zinc-800/60">
            <div>
              <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">Guest Collaborative Access</p>
              <p className="text-[11px] text-zinc-500">Allow unauthenticated guest users to view or edit public documents.</p>
            </div>
            <input
              type="checkbox"
              checked={settings.enableGuestAccess}
              onChange={(e) => setSettings({ ...settings, enableGuestAccess: e.target.checked })}
              className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 border-zinc-300 dark:border-zinc-700 cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">Public Web Sharing Links</p>
              <p className="text-[11px] text-zinc-500">Permit workspace members to toggle documents as publicly accessible.</p>
            </div>
            <input
              type="checkbox"
              checked={settings.allowPublicSharing}
              onChange={(e) => setSettings({ ...settings, allowPublicSharing: e.target.checked })}
              className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 border-zinc-300 dark:border-zinc-700 cursor-pointer"
            />
          </div>
        </div>

        {/* Section 2: Engine Performance & Compaction Tuning */}
        <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col gap-4">
          <div className="flex items-center gap-2 border-b border-zinc-100 dark:border-zinc-800/80 pb-3">
            <Sparkle size={18} className="text-brand-500" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-800 dark:text-zinc-200">
              CRDT Engine & Compaction Tuning
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Compaction Debounce Window (ms)
              </label>
              <input
                type="number"
                min={1000}
                max={60000}
                step={500}
                value={settings.compactionIntervalMs}
                onChange={(e) => setSettings({ ...settings, compactionIntervalMs: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-900 dark:text-zinc-100"
              />
              <span className="text-[10px] text-zinc-400 font-mono mt-1 block">Default: 3000ms write-behind flush</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Max Document Payload Limit (MB)
              </label>
              <input
                type="number"
                min={5}
                max={500}
                value={settings.maxDocumentSizeMB}
                onChange={(e) => setSettings({ ...settings, maxDocumentSizeMB: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-900 dark:text-zinc-100"
              />
              <span className="text-[10px] text-zinc-400 font-mono mt-1 block">Max binary Yjs state size</span>
            </div>
          </div>
        </div>

        {/* Section 3: Maintenance Mode */}
        <div className="p-5 rounded-2xl bg-rose-500/5 border border-rose-500/20 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-rose-500/15 text-rose-500">
              <WarningOctagon size={22} weight="fill" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">Global Cluster Maintenance Mode</h4>
              <p className="text-[11px] text-zinc-500">
                When active, all non-admin users will experience read-only document locking.
              </p>
            </div>
          </div>
          <input
            type="checkbox"
            checked={settings.maintenanceMode}
            onChange={(e) => setSettings({ ...settings, maintenanceMode: e.target.checked })}
            className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 border-rose-400 cursor-pointer"
          />
        </div>

        {/* Save Button */}
        <div className="flex justify-end pt-2">
          <Button type="submit" variant="primary" isLoading={isSaving} className="gap-2 px-6 bg-rose-600 hover:bg-rose-500 text-white">
            <FloppyDisk size={16} weight="bold" />
            <span>Save System Configuration</span>
          </Button>
        </div>
      </form>
    </div>
  );
};
