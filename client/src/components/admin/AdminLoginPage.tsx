import React, { useState } from "react";
import { useAuth } from "../../context/AuthContext.js";
import { Button } from "../ui/Button.js";
import { Input } from "../ui/Input.js";
import { ShieldCheck, ShieldWarning, Sparkle, ArrowLeft, Key } from "@phosphor-icons/react";

interface AdminLoginPageProps {
  onSuccess: () => void;
  onBackToWorkspace: () => void;
}

export const AdminLoginPage: React.FC<AdminLoginPageProps> = ({ onSuccess, onBackToWorkspace }) => {
  const { login } = useAuth();
  const [email, setEmail] = useState("admin@example.com");
  const [password, setPassword] = useState("password123");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await login(email.trim(), password.trim());
      onSuccess();
    } catch (err: any) {
      setError(err.message || "Invalid administrative credentials or insufficient permissions");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFillDemo = () => {
    setEmail("admin@example.com");
    setPassword("password123");
  };

  return (
    <div className="min-h-screen w-screen bg-zinc-950 flex flex-col items-center justify-center p-4 select-none relative overflow-hidden font-sans">
      {/* Ambient background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Return to workspace link */}
      <div className="absolute top-6 left-6 z-10">
        <button
          onClick={onBackToWorkspace}
          className="flex items-center gap-2 text-xs font-medium text-zinc-400 hover:text-zinc-100 px-3 py-1.5 rounded-lg bg-zinc-900/80 border border-zinc-800 hover:border-zinc-700 transition-all shadow-sm"
        >
          <ArrowLeft size={15} />
          <span>Return to Workspace</span>
        </button>
      </div>

      <div className="w-full max-w-md bg-zinc-900/90 border border-zinc-800 backdrop-blur-xl p-8 rounded-2xl shadow-2xl z-10 flex flex-col gap-6">
        {/* Brand & Security Badge Header */}
        <div className="flex flex-col items-center text-center gap-2">
          <div className="w-14 h-14 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-500 mb-1 shadow-lg shadow-rose-500/10">
            <ShieldCheck size={32} weight="fill" />
          </div>
          <div className="flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-widest text-rose-400 font-semibold">
            <Sparkle size={13} weight="fill" />
            <span>Admin Security Gateway</span>
          </div>
          <h1 className="text-xl font-bold text-zinc-100 tracking-tight">SyncCraft Platform Governance</h1>
          <p className="text-xs text-zinc-400 max-w-xs">
            Sign in with Super Administrator privileges to manage users, documents, and cluster telemetry.
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3 text-xs bg-rose-500/15 text-rose-400 border border-rose-500/30 rounded-xl flex items-center gap-2">
            <ShieldWarning size={18} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            label="Administrator Email"
            type="email"
            placeholder="admin@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
          />

          <Input
            label="Master Password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <Button
            type="submit"
            variant="primary"
            isLoading={isLoading}
            className="w-full bg-rose-600 hover:bg-rose-500 text-white font-semibold shadow-lg shadow-rose-500/20 py-2.5 mt-2"
          >
            Authenticate & Access Portal
          </Button>

          {/* Quick Demo Helper */}
          <button
            type="button"
            onClick={handleFillDemo}
            className="flex items-center justify-center gap-2 text-[11px] text-zinc-500 hover:text-rose-400 font-mono transition-colors pt-2"
          >
            <Key size={13} />
            <span>Quick-fill Default Super Admin (admin@example.com / password123)</span>
          </button>
        </form>
      </div>

      {/* Footer System Version */}
      <div className="mt-6 text-center text-[11px] text-zinc-600 font-mono">
        CRDT Distributed Engine • Super Admin Security Layer v2.0
      </div>
    </div>
  );
};
