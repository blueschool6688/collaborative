# API & WebSocket Interface Specification

## 1. Design Principles & Conventions

Following the `api-and-interface-design` specifications:
- **Contract-First**: Every endpoint has defined request bodies, query parameters, and response structures.
- **Predictable Error Semantics**: All error responses return structured JSON with clear HTTP status codes.
- **Boundary Validation**: Inputs are sanitized and validated at the controller boundary.
- **Idempotency**: Safe operations (`GET`, `DELETE`) are idempotent; state mutations follow predictable REST conventions.

---

## 2. Global Response & Error Schemas

### Standard Success Response:
```json
{
  "message": "Operation completed successfully",
  "data": { ... }
}
```

### Standard Error Response:
```json
{
  "error": "Human-readable error description"
}
```

| HTTP Status | Meaning | Scenario |
| :--- | :--- | :--- |
| `200 OK` | Request succeeded | Read, update, list operations |
| `201 Created` | Resource created | User registration, document creation |
| `400 Bad Request` | Invalid payload or missing fields | Empty title, short password |
| `401 Unauthorized` | Missing or invalid JWT | Expired session, bad token |
| `403 Forbidden` | Authenticated but insufficient permission | Viewer attempting to edit or delete / Non-admin accessing admin API |
| `404 Not Found` | Resource does not exist | Document or user not found |
| `409 Conflict` | Unique constraint violated | Email already registered |
| `500 Server Error` | Unhandled internal exception | Database connection failure |

---

## 3. Seeded Mock Test Accounts

The database comes pre-seeded with 5 test user accounts (including 1 Super Administrator) and collaborative documents:

| Name | Email | Password | Role / Color | Pre-seeded Ownership |
| :--- | :--- | :--- | :--- | :--- |
| **System Administrator** | `admin@example.com` | `password123` | **Super Admin** (`#ef4444` Crimson) | Full platform telemetry & governance access |
| **Alice Chen** | `alice@example.com` | `password123` | Lead Engineer (`#6366f1` Indigo) | Owner of *"⚡ Architecture & Distributed Systems Spec"* |
| **Bob Martinez** | `bob@example.com` | `password123` | Product Manager (`#10b981` Emerald) | Owner of *"📋 Product Roadmap & Team Milestones 2026"* |
| **Charlie Davis** | `charlie@example.com` | `password123` | UI/UX Designer (`#f59e0b` Amber) | Owner of *"🎨 Design System & Visual Hierarchy"* |
| **Diana Ross** | `diana@example.com` | `password123` | QA Engineer (`#ec4899` Pink) | Editor on Doc 1 & Doc 2 |

---

## 4. REST API Endpoints

### 4.1 Authentication & Social OAuth Module (`/api/auth`)

#### `POST /api/auth/register`
Create a new user account with email and password.
- **Request Body:**
  ```json
  {
    "email": "user@example.com",
    "password": "password123",
    "name": "Jane Doe"
  }
  ```
- **Response `201 Created`:**
  ```json
  {
    "message": "Account created successfully",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6...",
    "user": {
      "id": "cm6xoy7vg0000n4112x8p8w1a",
      "email": "user@example.com",
      "name": "Jane Doe",
      "avatar": null,
      "color": "#6366f1",
      "systemRole": "USER",
      "provider": "local",
      "createdAt": "2026-08-19T07:30:00.000Z"
    }
  }
  ```

#### `POST /api/auth/login`
Authenticate with email and password.
- **Request Body:**
  ```json
  {
    "email": "alice@example.com",
    "password": "password123"
  }
  ```
- **Response `200 OK`:**
  ```json
  {
    "message": "Login successful",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6...",
    "user": {
      "id": "cm6xoy7vg0000n4112x8p8w1a",
      "email": "alice@example.com",
      "name": "Alice Chen",
      "color": "#6366f1",
      "systemRole": "USER"
    }
  }
  ```

#### `POST /api/auth/oauth`
Authenticate or create account using Social OAuth provider (Google / GitHub).
- **Request Body:**
  ```json
  {
    "provider": "google",
    "email": "alice.chen@gmail.com",
    "name": "Alice Chen",
    "avatar": "https://lh3.googleusercontent.com/a/...",
    "providerId": "google_10293848"
  }
  ```
- **Response `200 OK`:**
  ```json
  {
    "message": "Signed in with google",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6...",
    "user": {
      "id": "cm6xoy7vg0000n4112x8p8w1a",
      "email": "alice.chen@gmail.com",
      "name": "Alice Chen",
      "avatar": "https://lh3.googleusercontent.com/a/...",
      "color": "#6366f1",
      "systemRole": "USER",
      "provider": "google"
    }
  }
  ```

#### `GET /api/auth/me`
Fetch current authenticated user profile using header `Authorization: Bearer <token>`.
- **Response `200 OK`:**
  ```json
  {
    "user": {
      "id": "cm6xoy7vg0000n4112x8p8w1a",
      "email": "alice@example.com",
      "name": "Alice Chen",
      "color": "#6366f1",
      "systemRole": "USER"
    }
  }
  ```

---

### 4.2 Super Admin Governance & Observability Module (`/api/admin`)
*All `/api/admin/*` endpoints require `systemRole: "ADMIN"` in the JWT token.*

#### `GET /api/admin/stats`
Retrieve aggregated platform telemetry metrics and runtime health.
- **Headers:** `Authorization: Bearer <admin_token>`
- **Response `200 OK`:**
  ```json
  {
    "stats": {
      "totalUsers": 5,
      "totalDocuments": 3,
      "totalSnapshots": 4,
      "totalUpdateLogs": 0,
      "totalStorageBytes": 5120,
      "systemHealth": "OPTIMAL",
      "uptimeSeconds": 1420,
      "nodeVersion": "v22.12.0",
      "memory": {
        "rssBytes": 68420000,
        "heapTotalBytes": 32500000,
        "heapUsedBytes": 19800000
      }
    }
  }
  ```

#### `GET /api/admin/users?q=<search>`
Search and list all platform users with owned and shared document counts.

#### `PATCH /api/admin/users/:id/role`
Promote or demote user system role (`"USER"` $\leftrightarrow$ `"ADMIN"`).
- **Request Body:** `{"systemRole": "ADMIN"}`

#### `DELETE /api/admin/users/:id`
Purge a user account and cascade delete their owned documents.

#### `GET /api/admin/documents?q=<search>`
List all platform documents with size, owner info, and snapshots version.

#### `DELETE /api/admin/documents/:id`
Force delete any document across the platform.

---

### 4.3 Document Module (`/api/documents`)

#### `GET /api/documents`
List all documents the authenticated user owns or has permission to collaborate on.
- **Headers:** `Authorization: Bearer <token>`
- **Response `200 OK`:**
  ```json
  {
    "documents": [
      {
        "id": "cm6xoy7vg0005n4112x8p8w1d",
        "title": "⚡ Architecture & Distributed Systems Spec",
        "icon": "⚡",
        "isPublic": true,
        "defaultRole": "EDITOR",
        "ownerId": "cm6xoy7vg0000n4112x8p8w1a",
        "owner": {
          "id": "cm6xoy7vg0000n4112x8p8w1a",
          "name": "Alice Chen",
          "email": "alice@example.com",
          "color": "#6366f1"
        },
        "userRole": "OWNER",
        "createdAt": "2026-08-19T06:00:00.000Z",
        "updatedAt": "2026-08-19T07:15:00.000Z"
      }
    ]
  }
  ```

#### `POST /api/documents`
Create a new blank document and initialize its first CRDT snapshot.

#### `GET /api/documents/:id`
Retrieve metadata and permission list for a specific document.

#### `PATCH /api/documents/:id`
Update document title, icon, or public accessibility settings (Requires `EDITOR` or `OWNER`).

#### `DELETE /api/documents/:id`
Delete a document and all related permissions, snapshots, and update logs (Requires `OWNER`).

#### `POST /api/documents/:id/permissions`
Invite or update a collaborator's role by email (Requires `OWNER`).

#### `DELETE /api/documents/:id/permissions/:targetUserId`
Revoke a collaborator's access (Requires `OWNER`).

---

### 4.4 Version History & Snapshots Module (`/api/documents/:id/history`)

#### `GET /api/documents/:id/history`
List timeline snapshots for the document.

#### `GET /api/documents/:id/history/:snapshotId`
Inspect the decoded text preview of a past snapshot.

#### `POST /api/documents/:id/history/restore`
Restore the active document state to a past snapshot (Requires `EDITOR` or `OWNER`).

---

## 5. WebSocket & Hocuspocus Synchronization Protocol

### 5.1 Connection Handshake
- **URL**: `ws://localhost:4000`
- **Document Room**: Passed in provider setup as document ID (`name: documentId`)
- **Authentication**: JWT token passed in connection parameters (`token: "<JWT>"`).

### 5.2 Server Handshake Lifecycle (`onAuthenticate`)
1. Client establishes WebSocket connection.
2. Server validates `token` against JWT secret:
   - If invalid token $\rightarrow$ Connection rejected (`Unauthorized`).
   - If document is public and no token $\rightarrow$ Guest session created with default role.
3. Server queries `document_permissions`:
   - If role is `VIEWER` $\rightarrow$ Server sets `connection.readOnly = true`.
   - If role is `EDITOR` or `OWNER` $\rightarrow$ Server enables bidirectional read/write.

### 5.3 Live Awareness Payload
The ephemeral awareness channel broadcasts:
```json
{
  "user": {
    "id": "cm6xoy7vg0000n4112x8p8w1a",
    "name": "Alice Chen",
    "color": "#6366f1",
    "avatar": null
  },
  "cursor": {
    "anchor": 142,
    "head": 148
  }
}
```
Awareness packets are throttled (50ms) and discarded from memory on peer disconnect.
