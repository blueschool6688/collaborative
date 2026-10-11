import React, { useState, useEffect } from "react";
import { Modal } from "../ui/Modal.js";
import { Button } from "../ui/Button.js";
import { Input } from "../ui/Input.js";
import { useAuth } from "../../context/AuthContext.js";
import { abort } from "process";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { login, register, loginWithOAuth, redirectToOAuth } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<"google" | "github" | null>(null);
  const [providers, setProviders] = useState<{ google: boolean; github: boolean }>({ google: true, github: false });

  // useEffect(() => {
  //   const controller = new AbortController();
  //   fetch("/api/auth/providers")
  //     .then((res) => res.json())
  //     .then((data) => setProviders(data))
  //     .catch(() => setProviders({ google: false, github: false }));

  //   const params = new URLSearchParams(window.location.search);
  //   const authError = params.get("auth_error");
  //   if (authError) {
  //     setError(decodeURIComponent(authError));
  //     params.delete("auth_error");
  //     const newSearch = params.toString() ? `?${params.toString()}` : "";
  //     window.history.replaceState({}, "", `${window.location.pathname}${newSearch}`);
  //   }

  //   return () => controller.abort();
  // }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (isRegister) {
        if (!name.trim()) {
          setError("Name is required");
          setIsLoading(false);
          return;
        }
        await register(name, email, password);
      } else {
        await login(email, password);
      }
      onClose();
    } catch (err: any) {
      setError(err.message || "Authentication failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOAuth = async (provider: "google" | "github") => {
    setError(null);
    setOauthLoading(provider);

    const isConfigured = providers[provider];
    if (isConfigured) {
      redirectToOAuth(provider);
      return;
    }

    try {
      await loginWithOAuth(provider);
      onClose();
    } catch (err: any) {
      setError(err.message || `Failed to sign in with ${provider}`);
    } finally {
      setOauthLoading(null);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isRegister ? "Create SyncCraft Account" : "Sign In to SyncCraft"}
      description={
        isRegister
          ? "Start collaborating in real-time on docs with your team."
          : "Welcome back! Enter your credentials to access your workspace."
      }
    >
      <div className="flex flex-col gap-4">
        {error && (
          <div className="p-3 text-xs bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-lg leading-relaxed">
            {error}
          </div>
        )}

        <div className="flex flex-col gap-2.5">
          <button
            type="button"
            onClick={() => handleOAuth("google")}
            disabled={oauthLoading !== null || isLoading}
            className="w-full px-4 py-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-semibold text-zinc-800 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800/80 transition-colors shadow-sm disabled:opacity-50"
          >
            <div className="flex items-center justify-center gap-2.5">
              {oauthLoading === "google" ? (
                <div className="w-4 h-4 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
              )}
              <span>Continue with Google</span>
            </div>
          </button>
          {/* 
          <button
            type="button"
            onClick={() => handleOAuth("github")}
            disabled={oauthLoading !== null || isLoading}
            className="w-full flex items-center justify-between px-4 py-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-semibold text-zinc-800 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800/80 transition-colors shadow-sm disabled:opacity-50"
          >
            <div className="flex items-center gap-2.5">
              {oauthLoading === "github" ? (
                <div className="w-4 h-4 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg className="w-4 h-4 fill-current shrink-0" viewBox="0 0 24 24">
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                  />
                </svg>
              )}
              <span>Continue with GitHub</span>
            </div>
            <span className="text-[10px] font-mono text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">
              {providers.github ? "OAuth 2.0" : "Demo 1-Click"}
            </span>
          </button> */}
        </div>

        {/* Divider */}
        <div className="relative flex py-1 items-center">
          <div className="flex-grow border-t border-zinc-200 dark:border-zinc-800"></div>
          <span className="flex-shrink mx-3 text-[11px] font-mono text-zinc-400 uppercase tracking-widest">
            or with email
          </span>
          <div className="flex-grow border-t border-zinc-200 dark:border-zinc-800"></div>
        </div>

        {/* Email / Password Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
          {isRegister && (
            <Input
              label="Full Name"
              placeholder="e.g. Alice Chen"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
            />
          )}

          <Input
            label="Email Address"
            type="email"
            placeholder="alice@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus={!isRegister}
          />

          <Input
            label="Password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            helperText={isRegister ? "Must be at least 6 characters" : undefined}
          />

          <Button type="submit" variant="primary" isLoading={isLoading} className="mt-1 w-full">
            {isRegister ? "Create Account" : "Sign In"}
          </Button>

          <div className="text-center pt-2 text-xs text-zinc-500">
            {isRegister ? (
              <span>
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setIsRegister(false);
                    setError(null);
                  }}
                  className="text-brand-500 hover:text-brand-400 font-medium"
                >
                  Sign in
                </button>
              </span>
            ) : (
              <span>
                Don't have an account?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setIsRegister(true);
                    setError(null);
                  }}
                  className="text-brand-500 hover:text-brand-400 font-medium"
                >
                  Create one
                </button>
              </span>
            )}
          </div>
        </form>
      </div>
    </Modal>
  );
};
