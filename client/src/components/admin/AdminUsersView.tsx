import React, { useState, useEffect } from "react";
import { api, AdminUserItem } from "../../lib/api.js";
import { formatDate } from "../../lib/utils.js";
import { Button } from "../ui/Button.js";
import { Badge } from "../ui/Badge.js";
import { Avatar } from "../ui/Avatar.js";
import { Input } from "../ui/Input.js";
import { Modal } from "../ui/Modal.js";
import {
  MagnifyingGlass,
  UserPlus,
  Trash,
  PencilSimple,
  ShieldCheck,
  ShieldWarning,
  ArrowClockwise,
  Key,
} from "@phosphor-icons/react";

export const AdminUsersView: React.FC = () => {
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"ALL" | "ADMIN" | "USER">("ALL");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminUserItem | null>(null);

  // Create User Form State
  const [createName, setCreateName] = useState("");
  const [createEmail, setCreateEmail] = useState("");
  const [createPassword, setCreatePassword] = useState("");
  const [createRole, setCreateRole] = useState<"USER" | "ADMIN">("USER");
  const [createColor, setCreateColor] = useState("#6366f1");
  const [isCreating, setIsCreating] = useState(false);

  // Edit User Form State
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editRole, setEditRole] = useState<"USER" | "ADMIN">("USER");
  const [editColor, setEditColor] = useState("#6366f1");
  const [isUpdating, setIsUpdating] = useState(false);

  const loadUsers = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.admin.users(query);
      setUsers(res.users);
    } catch (err: any) {
      setError(err.message || "Failed to load users");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
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
      await api.admin.createUser({
        name: createName,
        email: createEmail,
        password: createPassword,
        systemRole: createRole,
        color: createColor,
      });
      showNotification(`User ${createName} created successfully`);
      setIsCreateOpen(false);
      setCreateName("");
      setCreateEmail("");
      setCreatePassword("");
      loadUsers();
    } catch (err: any) {
      setError(err.message || "Failed to create user");
    } finally {
      setIsCreating(false);
    }
  };

  const handleOpenEdit = (user: AdminUserItem) => {
    setSelectedUser(user);
    setEditName(user.name);
    setEditEmail(user.email);
    setEditPassword("");
    setEditRole(user.systemRole);
    setEditColor(user.color);
    setIsEditOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setIsUpdating(true);
    setError(null);
    try {
      await api.admin.updateUser(selectedUser.id, {
        name: editName,
        email: editEmail,
        password: editPassword.trim() ? editPassword : undefined,
        systemRole: editRole,
        color: editColor,
      });
      showNotification(`User ${editName} updated successfully`);
      setIsEditOpen(false);
      loadUsers();
    } catch (err: any) {
      setError(err.message || "Failed to update user");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleToggleRole = async (userId: string, currentRole: "USER" | "ADMIN") => {
    const newRole = currentRole === "ADMIN" ? "USER" : "ADMIN";
    try {
      await api.admin.updateUserRole(userId, newRole);
      showNotification(`User role changed to ${newRole}`);
      loadUsers();
    } catch (err: any) {
      setError(err.message || "Failed to change user role");
    }
  };

  const handleDeleteUser = async (user: AdminUserItem) => {
    if (!window.confirm(`Permanently delete user "${user.name}" (${user.email}) and all owned documents?`)) return;
    try {
      await api.admin.deleteUser(user.id);
      showNotification(`User ${user.email} deleted`);
      loadUsers();
    } catch (err: any) {
      setError(err.message || "Failed to delete user");
    }
  };

  const filteredUsers = users.filter((u) => {
    if (roleFilter === "ALL") return true;
    return u.systemRole === roleFilter;
  });

  return (
    <div className="flex flex-col gap-6">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">User Management Module</h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Create, inspect, modify roles, reset passwords, or delete users across the workspace.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="primary" onClick={() => setIsCreateOpen(true)} className="gap-1.5 text-xs">
            <UserPlus size={15} weight="bold" />
            <span>Create New User</span>
          </Button>
          <Button size="sm" variant="outline" onClick={loadUsers} isLoading={isLoading} className="gap-1 text-xs">
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

      {/* Search Bar & Role Filter */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <MagnifyingGlass size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder="Search by user name or email..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-rose-500/30"
          />
        </div>

        <div className="flex items-center gap-1.5 self-start sm:self-auto bg-zinc-100 dark:bg-zinc-900 p-1 rounded-xl border border-zinc-200 dark:border-zinc-800">
          {(["ALL", "ADMIN", "USER"] as const).map((role) => (
            <button
              key={role}
              onClick={() => setRoleFilter(role)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                roleFilter === role
                  ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm"
                  : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300"
              }`}
            >
              {role === "ALL" ? "All Users" : role}
            </button>
          ))}
        </div>
      </div>

      {/* Users Data Table */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-50/70 dark:bg-zinc-800/40 text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider border-b border-zinc-200 dark:border-zinc-800">
                <th className="p-3.5">User Details</th>
                <th className="p-3.5">Role</th>
                <th className="p-3.5">Provider</th>
                <th className="p-3.5">Documents</th>
                <th className="p-3.5">Joined</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60 text-xs">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-zinc-500">
                    No users matching the query
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors">
                    <td className="p-3.5">
                      <div className="flex items-center gap-3">
                        <Avatar name={u.name} color={u.color} avatar={u.avatar} size="sm" />
                        <div>
                          <p className="font-semibold text-zinc-900 dark:text-zinc-100">{u.name}</p>
                          <p className="text-[11px] text-zinc-500 font-mono">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-3.5">
                      <Badge variant={u.systemRole === "ADMIN" ? "brand" : "neutral"} size="sm">
                        {u.systemRole}
                      </Badge>
                    </td>
                    <td className="p-3.5 text-[11px] font-mono capitalize text-zinc-500">{u.provider}</td>
                    <td className="p-3.5 text-[11px] text-zinc-500">
                      {u.ownedDocsCount} owned • {u.sharedDocsCount} shared
                    </td>
                    <td className="p-3.5 text-[11px] text-zinc-400 font-mono">{formatDate(u.createdAt)}</td>
                    <td className="p-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleToggleRole(u.id, u.systemRole)}
                          className="px-2 py-1 rounded text-[11px] font-medium border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                          title="Quick Role Toggle"
                        >
                          {u.systemRole === "ADMIN" ? "Demote" : "Promote Admin"}
                        </button>
                        <button
                          onClick={() => handleOpenEdit(u)}
                          className="p-1.5 rounded text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                          title="Edit User Details"
                        >
                          <PencilSimple size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteUser(u)}
                          className="p-1.5 rounded text-zinc-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                          title="Delete User"
                        >
                          <Trash size={14} />
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

      {/* CREATE USER MODAL */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Create Platform User"
        description="Add a new account directly to the PostgreSQL database."
      >
        <form onSubmit={handleCreateSubmit} className="flex flex-col gap-4">
          <Input
            label="Full Name"
            placeholder="e.g. Michael Jordan"
            value={createName}
            onChange={(e) => setCreateName(e.target.value)}
            required
            autoFocus
          />

          <Input
            label="Email Address"
            type="email"
            placeholder="michael@company.com"
            value={createEmail}
            onChange={(e) => setCreateEmail(e.target.value)}
            required
          />

          <Input
            label="Initial Password"
            type="password"
            placeholder="••••••••"
            value={createPassword}
            onChange={(e) => setCreatePassword(e.target.value)}
            required
            helperText="Minimum 6 characters"
          />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                System Role
              </label>
              <select
                value={createRole}
                onChange={(e) => setCreateRole(e.target.value as any)}
                className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-900 dark:text-zinc-100"
              >
                <option value="USER">USER (Regular Member)</option>
                <option value="ADMIN">ADMIN (Super Administrator)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Avatar Theme Color
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={createColor}
                  onChange={(e) => setCreateColor(e.target.value)}
                  className="w-8 h-8 rounded border-none cursor-pointer bg-transparent"
                />
                <span className="text-xs font-mono text-zinc-500">{createColor}</span>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isCreating}>
              Create User
            </Button>
          </div>
        </form>
      </Modal>

      {/* EDIT USER MODAL */}
      <Modal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        title="Edit User Profile"
        description="Update account metadata, reset credentials, or elevate privileges."
      >
        <form onSubmit={handleEditSubmit} className="flex flex-col gap-4">
          <Input
            label="Full Name"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            required
          />

          <Input
            label="Email Address"
            type="email"
            value={editEmail}
            onChange={(e) => setEditEmail(e.target.value)}
            required
          />

          <Input
            label="New Password (Leave blank to keep current)"
            type="password"
            placeholder="••••••••"
            value={editPassword}
            onChange={(e) => setEditPassword(e.target.value)}
            helperText="Optional password reset"
          />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                System Role
              </label>
              <select
                value={editRole}
                onChange={(e) => setEditRole(e.target.value as any)}
                className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-900 dark:text-zinc-100"
              >
                <option value="USER">USER (Regular Member)</option>
                <option value="ADMIN">ADMIN (Super Administrator)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Avatar Theme Color
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={editColor}
                  onChange={(e) => setEditColor(e.target.value)}
                  className="w-8 h-8 rounded border-none cursor-pointer bg-transparent"
                />
                <span className="text-xs font-mono text-zinc-500">{editColor}</span>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isUpdating}>
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
