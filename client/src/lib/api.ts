const API_BASE = import.meta.env.VITE_API_BASE_URL || "/api";

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string | null;
  color: string;
  systemRole?: "USER" | "ADMIN";
  provider?: string;
  createdAt: string;
}

export interface DocumentItem {
  id: string;
  title: string;
  icon?: string | null;
  isPublic: boolean;
  defaultRole: "VIEWER" | "EDITOR";
  ownerId: string;
  owner?: { id: string; name: string; email: string; color: string };
  userRole: "OWNER" | "EDITOR" | "VIEWER";
  createdAt: string;
  updatedAt: string;
  permissions?: {
    id: string;
    userId: string;
    role: "VIEWER" | "EDITOR" | "OWNER";
    user: { id: string; name: string; email: string; color: string };
  }[];
}

export interface SnapshotItem {
  id: string;
  version: number;
  size: number;
  createdBy?: string | null;
  createdAt: string;
  previewText?: string;
}

export interface AdminStats {
  totalUsers: number;
  totalDocuments: number;
  totalSnapshots: number;
  totalUpdateLogs: number;
  totalStorageBytes: number;
  systemHealth: "OPTIMAL" | "DEGRADED";
  uptimeSeconds: number;
  nodeVersion: string;
  memory: {
    rssBytes: number;
    heapTotalBytes: number;
    heapUsedBytes: number;
  };
  recentUsers: Array<{
    id: string;
    name: string;
    email: string;
    systemRole: "USER" | "ADMIN";
    color: string;
    createdAt: string;
  }>;
  recentDocuments: Array<{
    id: string;
    title: string;
    icon: string | null;
    isPublic: boolean;
    owner: { id: string; name: string; email: string; color: string };
    snapshotsCount: number;
    createdAt: string;
    updatedAt: string;
  }>;
}

export interface AdminUserItem {
  id: string;
  email: string;
  name: string;
  color: string;
  avatar: string | null;
  systemRole: "USER" | "ADMIN";
  provider: string;
  createdAt: string;
  ownedDocsCount: number;
  sharedDocsCount: number;
}

export interface AdminDocumentItem {
  id: string;
  title: string;
  icon: string | null;
  isPublic: boolean;
  defaultRole: string;
  ownerId?: string;
  owner: { id: string; name: string; email: string; color: string };
  collaboratorsCount: number;
  snapshotsCount: number;
  latestVersion: number;
  sizeBytes: number;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentAudit {
  document: {
    id: string;
    title: string;
    icon: string | null;
    isPublic: boolean;
    defaultRole: string;
    owner: { id: string; name: string; email: string; color: string };
    createdAt: string;
    updatedAt: string;
  };
  currentContentText: string;
  snapshots: Array<{
    id: string;
    version: number;
    size: number;
    createdBy: string | null;
    createdAt: string;
    previewText: string;
  }>;
  updateLogs: Array<{
    id: string;
    clock: number;
    sizeBytes: number;
    createdAt: string;
  }>;
  permissions: Array<{
    id: string;
    role: "VIEWER" | "EDITOR" | "OWNER";
    user: { id: string; name: string; email: string; color: string };
    createdAt: string;
  }>;
}

export interface SystemSettings {
  enableRegistration: boolean;
  enableGuestAccess: boolean;
  maintenanceMode: boolean;
  compactionIntervalMs: number;
  maxDocumentSizeMB: number;
  allowPublicSharing: boolean;
}

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem("sync_craft_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeader(),
      ...options.headers,
    },
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || "An error occurred");
  }

  return data;
}

export const api = {
  auth: {
    register: (data: { email: string; password: string; name: string }) =>
      request<{ token: string; user: User }>("/auth/register", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    login: (data: { email: string; password: string }) =>
      request<{ token: string; user: User }>("/auth/login", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    oauth: (data: { provider: "google" | "github"; email: string; name: string; avatar?: string; providerId?: string }) =>
      request<{ token: string; user: User; message: string }>("/auth/oauth", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    me: () => request<{ user: User }>("/auth/me"),
  },

  documents: {
    list: () => request<{ documents: DocumentItem[] }>("/documents"),
    create: (data: { title?: string; icon?: string; isPublic?: boolean; defaultRole?: string }) =>
      request<{ document: DocumentItem }>("/documents", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    get: (id: string) => request<{ document: DocumentItem }>(`/documents/${id}`),
    update: (id: string, data: Partial<DocumentItem>) =>
      request<{ document: DocumentItem }>(`/documents/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      request<{ message: string }>(`/documents/${id}`, {
        method: "DELETE",
      }),
    addPermission: (id: string, data: { email: string; role: "VIEWER" | "EDITOR" }) =>
      request<{ permission: any }>(`/documents/${id}/permissions`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
    removePermission: (id: string, targetUserId: string) =>
      request<{ message: string }>(`/documents/${id}/permissions/${targetUserId}`, {
        method: "DELETE",
      }),
  },

  history: {
    list: (docId: string) => request<{ snapshots: SnapshotItem[] }>(`/documents/${docId}/history`),
    preview: (docId: string, snapshotId: string) =>
      request<{ snapshot: SnapshotItem }>(`/documents/${docId}/history/${snapshotId}`),
    restore: (docId: string, snapshotId: string) =>
      request<{ message: string; snapshot: SnapshotItem }>(`/documents/${docId}/history/restore`, {
        method: "POST",
        body: JSON.stringify({ snapshotId }),
      }),
  },

  admin: {
    stats: () => request<{ stats: AdminStats }>("/admin/stats"),
    users: (q: string = "") => request<{ users: AdminUserItem[] }>(`/admin/users?q=${encodeURIComponent(q)}`),
    createUser: (data: { email: string; password: string; name: string; systemRole?: "USER" | "ADMIN"; color?: string }) =>
      request<{ message: string; user: AdminUserItem }>("/admin/users", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    updateUser: (id: string, data: { name?: string; email?: string; password?: string; systemRole?: "USER" | "ADMIN"; color?: string }) =>
      request<{ message: string; user: AdminUserItem }>(`/admin/users/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    updateUserRole: (id: string, systemRole: "USER" | "ADMIN") =>
      request<{ message: string; user: any }>(`/admin/users/${id}/role`, {
        method: "PATCH",
        body: JSON.stringify({ systemRole }),
      }),
    deleteUser: (id: string) =>
      request<{ message: string }>(`/admin/users/${id}`, {
        method: "DELETE",
      }),
    documents: (q: string = "") => request<{ documents: AdminDocumentItem[] }>(`/admin/documents?q=${encodeURIComponent(q)}`),
    getDocumentAudit: (id: string) => request<{ audit: DocumentAudit }>(`/admin/documents/${id}/audit`),
    updateDocumentContent: (id: string, textContent: string) =>
      request<{ message: string; snapshot: any }>(`/admin/documents/${id}/content`, {
        method: "PUT",
        body: JSON.stringify({ textContent }),
      }),
    restoreDocumentSnapshot: (id: string, snapshotId: string) =>
      request<{ message: string; snapshot: any }>(`/admin/documents/${id}/history/restore`, {
        method: "POST",
        body: JSON.stringify({ snapshotId }),
      }),
    createDocument: (data: { title: string; icon?: string; ownerId?: string; isPublic?: boolean; defaultRole?: string }) =>
      request<{ message: string; document: any }>("/admin/documents", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    updateDocument: (id: string, data: { title?: string; icon?: string; ownerId?: string; isPublic?: boolean; defaultRole?: string }) =>
      request<{ message: string; document: any }>(`/admin/documents/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    deleteDocument: (id: string) =>
      request<{ message: string }>(`/admin/documents/${id}`, {
        method: "DELETE",
      }),
    getSettings: () => request<{ settings: SystemSettings }>("/admin/settings"),
    updateSettings: (data: Partial<SystemSettings>) =>
      request<{ message: string; settings: SystemSettings }>("/admin/settings", {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
  },
};
