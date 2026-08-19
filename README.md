<div align="center">

# ⚡ SyncCraft — Real-Time Collaborative Rich-Text Editor (CRDT + Yjs)

An industrial-grade, distributed **Collaborative Rich-Text Workspace** powered by **CRDT (Yjs/YATA)**, synced via **Hocuspocus WebSocket Server**, persisted in **PostgreSQL** with debounced compaction snapshots, scaled horizontally across nodes with **Redis Pub/Sub**, and wrapped in a Notion/Linear-caliber editor interface adhering to `design-taste-frontend`.

---

[![Node.js](https://img.shields.io/badge/Node.js-v22+-339933?style=flat&logo=nodedotjs&logoColor=white)](https://nodejs.org)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat&logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![TipTap v2](https://img.shields.io/badge/TipTap-v2-black?style=flat)](https://tiptap.dev)
[![Yjs](https://img.shields.io/badge/CRDT-Yjs%20(YATA)-darkblue?style=flat)](https://yjs.dev)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16+-336791?style=flat&logo=postgresql&logoColor=white)](https://www.postgresql.org)
[![Redis](https://img.shields.io/badge/Redis-Pub%2FSub-DC382D?style=flat&logo=redis&logoColor=white)](https://redis.io)

</div>

---

## 📖 Table of Contents
1. [Overview & Why CRDT?](#-overview--why-crdt)
2. [End-to-End System Architecture](#-end-to-end-system-architecture)
3. [Distributed Systems Data Flow](#-distributed-systems-data-flow)
4. [Key Features & Editor Capabilities](#-key-features--editor-capabilities)
5. [Pre-seeded Mock Test Accounts](#-pre-seeded-mock-test-accounts)
6. [Monorepo Directory Structure](#-monorepo-directory-structure)
7. [Installation & Getting Started](#-installation--getting-started)
8. [Available Scripts](#-available-scripts)
9. [Documentation Directory](#-documentation-directory)

---

## 💡 Overview & Why CRDT?

Most legacy collaborative editors (e.g., legacy Google Docs) rely on **Operational Transformation (OT)**, which requires a single central server to act as the authoritative arbiter of keystroke ordering. If the server is unreachable or latency spikes, local typing becomes blocked or risks diverging.

**SyncCraft** uses **CRDT (Conflict-free Replicated Data Type)** running the **YATA (Yjs)** sequence algorithm:
- **Autonomous Node Replication**: Every browser tab is an autonomous replica that executes keystrokes **locally with 0ms latency**.
- **Strong Eventual Consistency (SEC)**: Merge operations are mathematically **Commutative**, **Associative**, and **Idempotent** ($A \sqcup B = B \sqcup A$). All peers always converge on the exact same character sequence without central locking.
- **Offline-First Resilience**: Full IndexedDB caching allows users to keep typing without internet. Upon reconnection, state vectors exchange diffs automatically.

---

## 🏗️ End-to-End System Architecture

```
+-----------------------------------------------------------------------------------+
|                                  CLIENT (BROWSER)                                 |
|  +-----------------------------------------------------------------------------+  |
|  | TipTap v2 Editor (React 19 + Tailwind CSS + Framer Motion)                  |  |
|  | - Extensions: StarterKit, TaskList, Table, CodeBlockLowlight, BubbleMenu    |  |
|  | - Collaboration & CollaborationCursor Extensions                           |  |
|  +-----------------------------------------------------------------------------+  |
|                                         ▲                                         |
|                                         │ Direct Binding                          |
|                                         ▼                                         |
|  +-----------------------------------------------------------------------------+  |
|  | Y.Doc (CRDT Core: Y.XmlFragment "default", UndoManager)                     |  |
|  +-----------------------------------------------------------------------------+  |
|                  ▲                                             ▲                  |
|                  │ (Local Cache)                               │ (Sync Binary)    |
|                  ▼                                             ▼                  |
|  +-------------------------------+             +-------------------------------+  |
|  | IndexedDB (y-indexeddb)       |             | Hocuspocus Provider (WS)      |  |
|  | Offline persistence & storage |             | State Vector & Live Awareness |  |
|  +-------------------------------+             +-------------------------------+  |
+----------------------------------------------------------------┼------------------+
                                                                 │ WebSocket (JWT Auth)
                                                                 ▼
+-----------------------------------------------------------------------------------+
|                        BACKEND SYNC SERVER (HOCUSPOCUS + EXPRESS)                 |
|  - Room/Document Manager (In-memory Y.Doc per active doc)                         |
|  - onAuthenticate Hook (Validate JWT, check VIEWER / EDITOR / OWNER role)         |
|  - State Vector Diff Sync & Binary Broadcast Engine                               |
|  - Ephemeral Awareness / Presence Distributor (Colored Live Cursors, Selection)   |
|  - Compaction Engine: Y.encodeStateAsUpdate() & snapshot flush                    |
+------------------------------┬---------------------------------┬------------------+
                               │                                 │
                 Pub/Sub Sync  │                                 │ Persistence Hook
                               ▼                                 ▼
               +-------------------------------+ +--------------------------------+
               | Redis Cluster (Pub/Sub)       | | PostgreSQL Database            |
               | - Multi-server instance sync  | | - users, documents, permissions|
               | - Ephemeral room broadcast    | | - document_snapshots (nén)     |
               | - 127.0.0.1:6379              | | - document_update_logs (delta) |
               +-------------------------------+ +--------------------------------+
```

---

## ⚡ Distributed Systems Data Flow

### 1. CAP & PACELC Tradeoffs
- **CAP Choice: AP (Availability + Partition Tolerance)**: Writing text cannot be blocked by network partitions.
- **PACELC: `PA/EL`**: In regular states, ultra-low Latency (**L**) is prioritized over synchronous server consensus (**C**).

### 2. State Vectors & Differential Synchronization
When two replicas sync, they exchange **State Vectors** (a summary mapping each ClientID to its highest clock):
$$\text{StateVector} = \{ \text{Client}_1: 210, \ \text{Client}_2: 95, \ \text{Client}_3: 512 \}$$
The server sends back only the missing binary delta $\Delta$ ($Clock > \text{StateVector}_{\text{client}}$), avoiding the overhead of re-transmitting the entire document.

### 3. Write-Behind Debounced Compaction Pipeline
To avoid disk I/O bottlenecks from keystroke-level database writes:
1. Keystrokes update in-memory `Y.Doc` and broadcast over WebSocket.
2. A **3-second debounce timer** activates.
3. On idle timeout, `Y.encodeStateAsUpdate()` compresses the full state into a binary snapshot in `document_snapshots`.
4. Older incremental delta rows in `document_update_logs` are automatically pruned.

---

## ✨ Key Features & Editor Capabilities

### 🎨 Linear/Notion-Caliber Rich Text Editing
- **Slash Commands (`/`)**: Type `/` to open a floating dropdown to insert H1-H3, Bullet lists, Task checklists, Tables, Code snippets, Blockquotes, or Dividers with full keyboard navigation (`↑`/`↓`/`Enter`/`Esc`).
- **Floating Bubble Menu**: Appears seamlessly on text selection for instant Bold, Italic, Strikethrough, Code, Highlight, Links, and Headings.
- **Interactive Tables**: Resizable columns with a floating toolbar to add/remove rows and columns dynamically.
- **Syntax Highlighting**: Code blocks with `lowlight` (highlight.js) language tokenization.

### 👥 Real-Time Collaboration & Presence
- **Live Cursors & Labels**: Remote cursors glide smoothly across the screen with designated pastel colors and user name badges.
- **Collaborator Avatar Pile**: Header displays active collaborators with green presence dots and tooltip metadata.
- **Offline Cache**: `y-indexeddb` provides 0ms initial load time and keeps offline changes safely cached.

### 🕒 Time-Travel Version History & 1-Click Restore
- **Snapshot Timeline**: Inspect past versions with timestamp, byte size, and author metadata.
- **Preview & Rollback**: Preview past document text and restore with a single click.

### 🔐 Document Governance & Permissions
- **Access Control**: Granular roles (`OWNER`, `EDITOR`, `VIEWER`).
- **Public Link Access**: Toggle public view/edit access for guest collaborators.
- **Command Palette (`⌘K` / `Ctrl+K`)**: Quick fuzzy switcher across documents and workspace actions.

---

## 📂 Monorepo Directory Structure

```
collaborative/
├── package.json                         # Root scripts (concurrently running server + client)
├── workflow.md                          # Master workflow & architecture summary
├── docs/
│   ├── distributed-systems-architecture.md # In-depth CAP, CRDT, State Vectors & Redis mesh
│   └── api-and-websocket-contracts.md      # REST API & WebSocket Protocol specifications
├── server/                              # Backend Node.js / Express / Hocuspocus / Prisma
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env.example                     # Environment template
│   ├── prisma/
│   │   ├── schema.prisma                # PostgreSQL Prisma Schema
│   │   └── seed.ts                      # Database Mock Seeder
│   ├── src/
│   │   ├── index.ts                     # Express REST + Hocuspocus WebSocket entry point
│   │   ├── config.ts                    # Environment configurations
│   │   ├── db.ts                        # Prisma Client singleton
│   │   ├── auth/
│   │   │   ├── jwt.ts                   # Token signing & verification
│   │   │   └── auth.middleware.ts       # Express auth middleware guard
│   │   ├── routes/
│   │   │   ├── auth.routes.ts           # /api/auth (register, login, me)
│   │   │   ├── document.routes.ts       # /api/documents (CRUD, sharing, permissions)
│   │   │   └── history.routes.ts        # /api/documents/:id/history (snapshots & restore)
│   │   └── hocuspocus/
│   │       ├── server.ts                # Hocuspocus instance setup
│   │       ├── auth.hook.ts             # onAuthenticate: JWT check & role permission guard
│   │       ├── persistence.hook.ts      # onLoadDocument & onStoreDocument (Compaction)
│   │       └── redis.ts                 # Redis Pub/Sub scaling extension
│   └── tests/
│       ├── crdt.test.ts                 # Mathematical convergence unit tests (Vitest)
│       └── auth.test.ts                 # JWT signing unit tests
└── client/                              # Frontend React 19 / Vite / TipTap v2 / Tailwind
    ├── package.json
    ├── vite.config.ts
    ├── tailwind.config.js
    ├── index.html
    └── src/
        ├── main.tsx
        ├── App.tsx                      # Main workspace orchestrator
        ├── context/
        │   ├── AuthContext.tsx          # Current user state & JWT management
        │   └── ThemeContext.tsx         # Dark/Light theme provider
        ├── components/
        │   ├── layout/
        │   │   ├── Sidebar.tsx          # Documents list, search trigger, new doc
        │   │   ├── Header.tsx           # Breadcrumbs, title edit, sync badge, avatar pile
        │   │   └── CommandPalette.tsx   # Cmd+K quick switcher
        │   ├── editor/
        │   │   ├── CollaborativeEditor.tsx # TipTap v2 + Yjs + Awareness integration
        │   │   ├── BubbleMenu.tsx       # Selection floating toolbar
        │   │   ├── SlashCommandMenu.tsx # Notion-style "/" block popup
        │   │   └── TableMenu.tsx        # Dynamic table operations toolbar
        │   ├── modals/
        │   │   ├── AuthModal.tsx        # Sign In & Sign Up modal
        │   │   ├── ShareModal.tsx       # Collaboration invite & link sharing
        │   │   └── VersionHistoryModal.tsx # Timeline snapshots & 1-click restore
        │   └── ui/                      # Atomic Button, Input, Modal, Avatar, Badge
        ├── hooks/
        │   ├── useCollaboration.ts      # Hook connecting Y.Doc, HocuspocusProvider, IndexedDB
        │   └── useAwareness.ts          # Hook tracking active peers & live cursors
        └── lib/
            ├── api.ts                   # Fetch wrapper with auto Authorization headers
            └── utils.ts                 # Helpers for styling and formatting
```

---

## 🚀 Installation & Getting Started

### Prerequisites
- **Node.js**: v20.x or higher
- **PostgreSQL**: Running on `127.0.0.1:5432` (Default database: `collaborative_db`)
- **Redis**: Running on `127.0.0.1:6379`

### Step 1: Clone & Install Dependencies
```bash
git clone https://github.com/your-org/sync-craft.git
cd sync-craft

# Install root dependencies
npm install

# Install server & client dependencies
cd server && npm install
cd ../client && npm install
cd ..
```

### Step 2: Configure Environment Variables
Copy the example environment in `server/`:
```bash
cp server/.env.example server/.env
```

### Step 3: Push Database Schema & Seed Data
```bash
# Push Prisma schema to PostgreSQL
npm run prisma:push

# Seed mock users, rich CRDT documents, and snapshots
npm run seed
```

### Step 4: Run Development Server
```bash
npm run dev
```

- **Frontend Client**: [http://localhost:5173](http://localhost:5173)
- **Backend REST API**: `http://localhost:4000`
- **Hocuspocus WebSocket Engine**: `ws://localhost:4000`

---

## 🧪 Available Scripts

| Command | Description |
| :--- | :--- |
| `npm run dev` | Starts both server and client concurrently in development mode |
| `npm run test` | Runs the Vitest test suite for CRDT convergence and JWT auth |
| `npm run build` | Compiles server TypeScript and creates client production bundle |
| `npm run seed` | Seeds PostgreSQL with 4 mock users and rich collaborative documents |
| `npm run prisma:push` | Synchronizes the Prisma schema into PostgreSQL without migrations |
| `npm run prisma:studio` | Launches Prisma Studio GUI at `http://localhost:5555` |

---

## 📚 Documentation Directory

- 🧪 [**Offline-First Testing & Notion Editor Architecture Guide**](docs/offline-testing-and-notion-editor-guide.md) — Comprehensive guide on offline testing scenarios, state vector reconciliation, and Notion-like Slash Menu `/` components.
- 🧠 [**Deep Dive: CRDT, Hocuspocus & Distributed Systems**](docs/deep-dive-crdt-hocuspocus-distributed-systems.md) — Comprehensive explanation of distributed data flow, CRDT YATA mechanics, and Hocuspocus vs raw WebSockets.
- 📐 [**Distributed Systems Architecture & Data Flow**](docs/distributed-systems-architecture.md) — Mathematical proofs, CAP theorems, State Vector mechanics, and Redis mesh topologies.
- 🔌 [**API & WebSocket Interface Specification**](docs/api-and-websocket-contracts.md) — REST endpoint schemas, error formatting, and WebSocket handshake protocols.
- 🔄 [**Master Workflow Manual**](workflow.md) — End-to-end technical overview and operating principles.
- 📋 [**Implementation Tasks & Checklist**](tasks/todo.md) — Engineering milestone tracking.