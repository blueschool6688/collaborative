const API_BASE = "/api";

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string | null;
  color: string;
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
};
