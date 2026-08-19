import React, { useState } from "react";
import { Modal } from "../ui/Modal.js";
import { Button } from "../ui/Button.js";
import { Input } from "../ui/Input.js";
import { useAuth } from "../../context/AuthContext.js";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { login, register } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

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
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error && (
          <div className="p-3 text-xs bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-lg">
            {error}
          </div>
        )}

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

        <Button type="submit" variant="primary" isLoading={isLoading} className="mt-2 w-full">
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
    </Modal>
  );
};
