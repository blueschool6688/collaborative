<div align="center">

# ⚡ SyncCraft — Industrial Real-Time Collaborative Editor

**Distributed Real-Time Collaborative Rich-Text Editor powered by CRDT (Yjs/YATA), Hocuspocus WebSocket Engine, PostgreSQL Compaction, and Redis Pub/Sub Horizontal Scaling.**

---

[![Node.js](https://img.shields.io/badge/Node.js-v22+-339933?style=flat&logo=nodedotjs&logoColor=white)](https://nodejs.org)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat&logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![TipTap v2](https://img.shields.io/badge/TipTap-v2-black?style=flat)](https://tiptap.dev)
[![Yjs CRDT](https://img.shields.io/badge/CRDT-Yjs%20(YATA)-darkblue?style=flat)](https://yjs.dev)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16+-336791?style=flat&logo=postgresql&logoColor=white)](https://www.postgresql.org)
[![Redis](https://img.shields.io/badge/Redis-Pub%2FSub-DC382D?style=flat&logo=redis&logoColor=white)](https://redis.io)
[![Docker](https://img.shields.io/badge/Docker-Multi--Stage-2496ED?style=flat&logo=docker&logoColor=white)](https://www.docker.com)

</div>

---

## 📑 Table of Contents

1. [Executive Summary & Core Philosophy](#-executive-summary--core-philosophy)
2. [Distributed Systems Architecture & Theory](#-distributed-systems-architecture--theory)
   - [CAP & PACELC Theorem Mapping](#1-cap--pacelc-theorem-mapping)
   - [CRDT (YATA) vs Operational Transformation (OT)](#2-crdt-yata-vs-operational-transformation-ot)
   - [Strong Eventual Consistency (SEC) Mathematical Proof](#3-strong-eventual-consistency-sec-mathematical-proof)
   - [State Vectors & Differential Synchronization](#4-state-vectors--differential-synchronization)
   - [Multi-Node Horizontal Scaling via Redis Mesh](#5-multi-node-horizontal-scaling-via-redis-mesh)
   - [Write-Behind Debounced Compaction Pipeline](#6-write-behind-debounced-compaction-pipeline)
   - [Distributed Awareness & Ephemeral Presence](#7-distributed-awareness--ephemeral-presence)
   - [Deep-Dive: Critical Distributed Scenarios & Conflict Resolution](#8-deep-dive-critical-distributed-scenarios--conflict-resolution)
   - [Distributed Edge Cases & Fault Tolerance Matrix](#9-distributed-edge-cases--fault-tolerance-matrix)
3. [End-to-End System Topology](#-end-to-end-system-topology)
4. [Key Features & Editor Capabilities](#-key-features--editor-capabilities)
5. [Monorepo Directory Structure](#-monorepo-directory-structure)
6. [Pre-seeded Test Accounts](#-pre-seeded-test-accounts)
7. [Quick Start & Installation](#-quick-start--installation)
8. [Docker & Production Deployment](#-docker--production-deployment)
9. [Available Scripts & Automated Tests](#-available-scripts--automated-tests)
10. [Documentation Index](#-documentation-index)

---

## 💡 Executive Summary & Core Philosophy

Traditional collaborative rich-text suites (such as early Google Docs or basic WebSocket setups) rely on centralized **Operational Transformation (OT)** or simple master-slave locking. These systems suffer from single-point-of-failure bottlenecks, high network sensitivity, and complex server-side transformation state matrices.

**SyncCraft** is architected as an **Offline-First Distributed Autonomous Replica System**:
- **0ms Local Mutation**: Every client tab acts as an autonomous replica executing edits immediately against local in-memory CRDT structures.
- **Conflict-Free Convergence**: Replicas exchange compact binary diffs asynchronously and mathematically converge to identical document states without centralized transformation locks.
- **Industrial Scale**: Horizontally scalable WebSocket cluster decoupled via Redis Pub/Sub with smart storage compaction into PostgreSQL.

---

## 🌐 Distributed Systems Architecture & Theory

### 1. CAP & PACELC Theorem Mapping

```
                 CAP THEOREM                      PACELC THEOREM
          Consistency (C)                           If Partition (P):
                 ▲                                     ➜ Availability (A) over Consistency (C)
                 │                                  Else (E):
        ┌────────┴────────┐                            ➜ Latency (L) over Consistency (C)
        │                 │
  [AP CHOSEN]       [AP CHOSEN]
Availability (A)  Partition Tolerance (P)
```

- **CAP Choice: `AP` (Availability + Partition Tolerance)**
  - Local user keystroke availability cannot be blocked by transient network partitions, packet loss, or high round-trip latency.
  - When disconnected, clients continue editing inside local memory and IndexedDB.
- **PACELC Formulation: `PA/EL`**
  - **Partition State (`PA`)**: Maintain full read/write availability locally; reconcile upon network heal.
  - **Normal State (`EL`)**: Prioritize sub-10ms local render latency over synchronous two-phase commit server consensus.

---

### 2. CRDT (YATA) vs Operational Transformation (OT)

| Evaluation Metric | Operational Transformation (OT) | CRDT / Yjs (SyncCraft) |
| :--- | :--- | :--- |
| **Authority Model** | Centralized server acts as authoritative ordering arbiter | Decentralized peer-to-peer / multi-replica model |
| **Local Typing Latency** | Must wait for server ack or buffer complex unacknowledged ops | **0ms instantaneous** local mutation |
| **Offline Editing** | Extremely complex; requires replay and transformation queues | **Native offline-first** via local state vector diffs |
| **Algorithm Complexity** | $O(N^2)$ transformation matrix with edge-case vulnerabilities | $O(N)$ sequence insertion via YATA relative linked list |
| **Fault Tolerance** | Single server failure disrupts active editing pipelines | Any node failure has zero impact on local replicas |

---

### 3. Strong Eventual Consistency (SEC) Mathematical Proof

A distributed system satisfies **Strong Eventual Consistency (SEC)** if all replicas that have received the same set of updates reach identical states regardless of delivery ordering.

SyncCraft CRDT updates form a **Bounded Join-Semilattice** $(\mathcal{S}, \sqcup)$ governed by three algebraic axioms:

$$\begin{aligned}
\text{Commutativity:} \quad & A \sqcup B = B \sqcup A \\
\text{Associativity:} \quad & (A \sqcup B) \sqcup C = A \sqcup (B \sqcup C) \\
\text{Idempotency:} \quad & A \sqcup A = A
\end{aligned}$$

#### Practical Distributed Implications:
1. **Network Retries**: If an unstable mobile connection delivers packet $A$ three times, $A \sqcup A \sqcup A = A$ guarantees no duplicate characters are inserted.
2. **Out-of-Order Delivery**: If packet $B$ reaches a server node before packet $A$, $B \sqcup A = A \sqcup B$ guarantees identical converged text.
3. **No Distributed Locks**: Zero requirement for distributed 2PC or Raft consensus on keystrokes.

---

### 4. State Vectors & Differential Synchronization

Every character or block inserted into the CRDT is identified by a monotonically increasing tuple:

$$\text{Item ID} = (\text{ClientID}, \text{LogicalClock})$$

A **State Vector** compacts the highest known logical clock observed from each peer into a lightweight dictionary:

$$\text{StateVector} = \{ \text{Client}_A: 1420, \ \text{Client}_B: 830, \ \text{Client}_C: 2105 \}$$

```
+-------------------+                                  +-------------------+
|  Client Replica   |                                  |   Server Node     |
+---------┬---------+                                  +---------┬---------+
          │  1. Send Local StateVector (e.g. 40 bytes)           │
          ├─────────────────────────────────────────────────────►│
          │                                                      │ 2. Compute missing delta:
          │                                                      │    Δ = ExtractUpdates(Doc, SV)
          │  3. Stream Binary Delta Δ                            │
          │◄─────────────────────────────────────────────────────┤
          │                                                      │
          │ 4. Y.applyUpdate(Δ) [Converged]                      │
```

- **Bandwidth Optimization**: Instead of sending entire documents (e.g., 5MB), sync handshakes exchange a **~50-byte State Vector**, returning only the unobserved binary delta $\Delta$ (often < 1KB).

---

### 5. Multi-Node Horizontal Scaling via Redis Mesh

To scale beyond a single WebSocket process across multiple instances, nodes, or regions, SyncCraft utilizes **Hocuspocus Redis Pub/Sub Extension**:

```
                  +----------------------------------------------+
                  |           Load Balancer / Ingress            |
                  +-----------------------┬----------------------+
                                          │
                  ┌───────────────────────┴──────────────────────┐
                  ▼                                              ▼
    +---------------------------+                  +---------------------------+
    |   Server Node 1 (Tokyo)   |                  |   Server Node 2 (Oregon)  |
    | - Active Room: "doc-101"  |                  | - Active Room: "doc-101"  |
    | - Client A (Alice) WS     |                  | - Client B (Bob) WS       |
    +-------------┬-------------+                  +-------------┬-------------+
                  │                                              │
                  │ Publish: "hocuspocus:doc-101"                │ Subscribe: "hocuspocus:doc-101"
                  └───────────────────────┬──────────────────────┘
                                          ▼
                         +---------------------------------+
                         |    Redis Cluster (Pub/Sub)      |
                         |  - Channel: hocuspocus:<docId>  |
                         |  - Ephemeral Binary Relay       |
                         +---------------------------------+
```

- **Decoupled WebSocket Replicas**: Clients editing the same document can connect to different server instances without sticky session constraints.
- **Sub-Millisecond Cross-Node Relaying**: Binary updates received by Node 1 are published to Redis and instantly fanned out to Node 2, which dispatches them to connected local WebSockets.

---

### 6. Write-Behind Debounced Compaction Pipeline

High-velocity keystrokes (300+ WPM across dozens of simultaneous collaborators) would saturate PostgreSQL write throughput if flushed per-keystroke.

```
Keystrokes ──► In-Memory Y.Doc ──► 3s Debounce Timer ──► Y.encodeStateAsUpdate() ──► PostgreSQL (Binary Snapshot)
                                          │
                               (Reset on active edit)
```

1. **Hot Path (In-Memory)**: Edits mutate in-memory `Y.Doc` and relay over WebSocket/Redis instantly (< 5ms).
2. **Debounced Compaction**: An adaptive timer buffers disk persistence until a 3-second quiet period or room eviction.
3. **Compacted Snapshot Storage**: The full document history is compressed into a single binary blob in `document_snapshots`, trimming intermediate delta logs and optimizing storage footprint.

---

### 7. Distributed Awareness & Ephemeral Presence

Collaborator cursor positions, text selection ranges, and client profiles are ephemeral and do not belong in persistent disk storage.

- **Awareness State Propagation**: Lightweight JSON payloads containing `{ user: { name, color, avatar }, cursor: { anchor, head } }` broadcast at 30Hz.
- **Heartbeat & Zombie Pruning**: If a client abruptly closes their laptop lid or loses connection, the server's heartbeat automatically purges their presence badge within 15 seconds.

---

### 8. Deep-Dive: Critical Distributed Scenarios & Conflict Resolution

#### 📡 Scenario A: Offline Editing ➔ Network Reconnection (Offline-First Flow)

What happens when a user loses internet (e.g. on a plane), types extensive content offline, and reconnects hours later while other collaborators have also made edits?

```
 [CLIENT (OFFLINE)]                                                       [SERVER NODE]
        │                                                                       │
        ├── 1. WebSocket Drops ──► Provider status: "disconnected"              │
        ├── 2. User types offline ──► Local Y.Doc mutates (0ms latency)         │
        ├── 3. Binary updates persist to Browser IndexedDB (y-indexeddb)        │
        │      (Data survives browser close/reboot)                             │
        │                                                                       │
        │ ══════════════════ [NETWORK RECONNECTED] ══════════════════           │
        │                                                                       │
        ├── 4. WebSocket reconnects ──► Handshake begins                        │
        ├── 5. Client sends its StateVector_Client (~50 bytes) ────────────────►│
        │                                                                       │ 6. Server calculates:
        │                                                                       │    Δ_ServerMissing = ExtractUpdates(ServerDoc, SV_Client)
        │                                                                       │    Δ_ClientMissing = ExtractUpdates(ServerDoc, SV_Server)
        │◄─── 7. Server sends missing updates Δ_ClientMissing ──────────────────┤
        ├──── 8. Client sends missing offline updates Δ_ServerMissing ─────────►│
        │                                                                       │ 9. Server applies Δ_ServerMissing
        ├── 10. Client applies Δ_ClientMissing locally                          │    - Broadcasts delta to Redis
        │       (Both Client and Server converge to identical state)            │    - Debounces 3s flush to PostgreSQL
        ▼                                                                       ▼
```

1. **Local Isolation & Durability**: When offline, the UI does NOT freeze. Edits immediately commit to in-memory `Y.Doc` and asynchronously write to **IndexedDB**. Even if the user refreshes the page or reboots the computer offline, all edits are intact.
2. **Bidirectional State Vector Handshake**: Upon reconnection, neither side uploads the entire document. Instead, each peer transmits its compact `StateVector` ($\approx 50$ bytes).
3. **Symmetric Delta Reconciliation**:
   - The server computes the binary delta $\Delta_{S \to C}$ of all changes that occurred on the server while the client was offline, streaming it to the client.
   - The client computes the binary delta $\Delta_{C \to S}$ containing its offline work and streams it to the server.
4. **Strong Convergence**: Through the CRDT Semilattice properties, both updates are applied without overwriting or erasing each other's work. The server then pushes the client's offline changes to other active peers via Redis Pub/Sub.

---

#### ⚡ Scenario B: Multi-User Concurrent Edits on the Exact Same Line / Position

What happens when Alice and Bob type or delete characters at the exact same index or line at the same millisecond?

```
Initial Document: "Hello World"
Cursor Position: Index 5 (between "Hello" and " World")

   [Alice Replica (Client 101)]                 [Bob Replica (Client 202)]
   Types " Super" at index 5                    Types " Great" at index 5
   Item_A: { ID: (101, Clock: 1),               Item_B: { ID: (202, Clock: 1),
             originLeft: 'o',                             originLeft: 'o',
             originRight: ' ' }                           originRight: ' ' }
                │                                            │
                └─────────────────────┬──────────────────────┘
                                      ▼
                      YATA Algorithmic Tie-Breaking:
                 Both have same originLeft and originRight.
                    Compare ClientID: Client 202 > Client 101
                                      ▼
                    Converged Output across ALL replicas:
                         "Hello Great Super World"
```

1. **Concurrent Insertions at Same Index (YATA Ordering)**:
   - Every inserted character is an `Item` with an immutable `ID = (ClientID, LogicalClock)` and stores relative pointers: `originLeft` (the preceding item when created) and `originRight` (the succeeding item when created).
   - If Alice and Bob insert at the identical location, both items share the exact same `originLeft` and `originRight`.
   - The **YATA (Yet Another Transformation Approach)** algorithm deterministically resolves order by comparing `ClientID` (or logical clock). Because `202 > 101`, `Item_B` is placed before `Item_A` on **every single client across the world**. No split-brain text divergence is possible.

2. **Simultaneous Insert vs Delete (Tombstone Handling)**:
   - If Alice types a word inside line 1 while Bob simultaneously presses `Backspace` / `Delete` to remove line 1:
   - CRDT uses **Tombstones** (`item.deleted = true`) rather than physically removing memory nodes from the linked structure.
   - Alice's newly inserted characters remain anchored to their respective `originLeft` item (even though it is marked deleted), preventing memory corruption, lost cursors, or crash conditions.

3. **Overlapping Formatting Spans (Mark Unioning)**:
   - If Alice applies **Bold** to words `[0..10]` while Bob simultaneously applies **Italic & Highlight** to words `[5..15]`:
   - Formatting attributes are non-destructive metadata sets. The overlapping range `[5..10]` automatically merges into `{ bold: true, italic: true, highlight: true }`.

---

### 9. Distributed Edge Cases & Fault Tolerance Matrix

| Edge Case Scenario | System Behavior & Mitigation | Algorithmic Guarantee |
| :--- | :--- | :--- |
| **Simultaneous Insertion at Identical Position** | Alice and Bob both type character `'X'` and `'Y'` at index 5 at the exact same millisecond. | **Deterministic ClientID Tie-Breaking**: YATA compares unique `(ClientID, Clock)` to establish consistent deterministic character ordering across all replicas. |
| **Prolonged Offline Editing** | User edits document on a 10-hour flight without internet. | **IndexedDB Persistence + State Vector Exchange**: Upon reconnection, only the accumulated delta is transmitted; zero data loss occurs. |
| **Simultaneous Edit vs Delete** | User A edits text on line 3 while User B deletes line 3. | **Tombstones (`deleted = true`)**: Deleted nodes retain linked-list causality; newly inserted characters retain valid anchor references. |
| **Temporary Network Partition / Packet Loss** | WebSocket drops intermittently due to unstable 4G/5G. | **Semilattice Idempotency**: Re-transmitted packets do not cause duplication ($A \sqcup A = A$). Exponential backoff reconnects automatically. |
| **Database Downtime** | PostgreSQL is undergoing backup or restart while users type. | **In-Memory Buffer Continuity**: Active sessions remain uninterrupted in memory; snapshots flush once DB connectivity recovers. |
| **Cross-Server Cluster Failover** | Server Node 1 crashes unexpectedly. | **Redis Relay & Auto-Reconnect**: Clients reconnect to Server Node 2, hydrate from PostgreSQL/Redis snapshot, and resume editing seamlessly. |
| **Simultaneous Format Overlapping** | One user bolds text while another user applies italic/color to the same range. | **Formatting Spans Merge**: Non-destructive mark attribute unioning preserves both styling intentions. |

---

## 🏗️ End-to-End System Topology

```
+---------------------------------------------------------------------------------------------------+
|                                          CLIENT TIER (BROWSER)                                    |
|  +---------------------------------------------------------------------------------------------+  |
|  | TipTap v2 Editor (React 19 + Tailwind CSS + Framer Motion)                                  |  |
|  | - Features: Slash Command Menu (/), Floating Bubble Menu, Dynamic Tables, Code Syntax       |  |
|  | - Collaboration & CollaborationCursor Extensions                                           |  |
|  +----------------------------------------------┬----------------------------------------------+  |
|                                                 │ Direct Reactive Binding                         |
|                                                 ▼                                                 |
|  +---------------------------------------------------------------------------------------------+  |
|  | Y.Doc (CRDT Core: Y.XmlFragment "default", UndoManager, StructStore)                         |  |
|  +----------------------------------------------┬----------------------------------------------+  |
|                         ▲                       │                       ▲                         |
|      Local Cache Sync   │                       │ Binary Diff           │ Live Ephemeral Presence |
|                         ▼                       │                       ▼                         |
|  +-------------------------------+              │              +-------------------------------+  |
|  | IndexedDB (y-indexeddb)       |              │              | Hocuspocus Provider           |  |
|  | Local offline storage         |              │              | WebSocket Client (JWT Auth)   |  |
|  +-------------------------------+              │              +---------------┬---------------+  |
+-------------------------------------------------┼------------------------------┼------------------+
                                                  │                              │
                                                  │ Secure WebSocket (Port 4000) │
                                                  ▼                              ▼
+---------------------------------------------------------------------------------------------------+
|                                  BACKEND SERVER CLUSTER (NODE.JS 22)                              |
|  +---------------------------------------------------------------------------------------------+  |
|  | Hocuspocus WebSocket Engine & Express REST Gateway                                          |  |
|  | - Room Manager: In-Memory Y.Doc cache per active room                                       |  |
|  | - onAuthenticate Hook: JWT verification & RBAC authorization (OWNER, EDITOR, VIEWER)        |  |
|  | - State Vector Reconciliation & Binary Broadcast Engine                                     |  |
|  | - Compaction Pipeline: Y.encodeStateAsUpdate() debounce flusher                             |  |
|  +------------------------------┬---------------------------------┬----------------------------+  |
+---------------------------------┼---------------------------------┼-------------------------------+
                                  │                                 │
                    Pub/Sub Relay │                                 │ Write-Behind Persistence
                                  ▼                                 ▼
                 +--------------------------------+ +--------------------------------+
                 | Redis Cluster (Pub/Sub)        | | PostgreSQL Database            |
                 | - Horizontal Multi-Node Mesh   | | - users & authentication       |
                 | - Channel: hocuspocus:<docId>  | | - documents & RBAC permissions |
                 | - Ephemeral room broadcasting  | | - document_snapshots (binary)  |
                 +--------------------------------+ +--------------------------------+
```

---

## ✨ Key Features & Editor Capabilities

### 🎨 Notion / Linear-Caliber Rich Text Editing
- **Slash Commands (`/`)**: Type `/` anywhere to trigger an accessible floating dropdown menu. Insert Headings (H1-H3), Bullet Lists, Numbered Lists, Task Checklists, Dynamic Tables, Code Blocks, Blockquotes, or Horizontal Rules with full keyboard navigation (`↑`/`↓`/`Enter`/`Esc`).
- **Contextual Bubble Menu**: Automatically appears on text selection for quick styling (Bold, Italic, Strikethrough, Code, Highlight, Headings, Lists, Links).
- **Interactive Dynamic Tables**: Resizable columns with a floating toolbar to insert/remove rows and columns on the fly.
- **Code Block Syntax Highlighting**: Automatic multi-language code tokenization via `lowlight` (highlight.js).
- **Interactive Checklists**: Collaborative task checkboxes that sync toggle state across all clients in real time.

### 👥 Real-Time Presence & Collaboration
- **Live Colored Cursors**: Remote cursors track smoothly with pastel colors and collaborator name tags.
- **Active Collaborator Pile**: Header displays live user avatars with presence status indicators.
- **Offline Resilience**: Offline changes are safely persisted to IndexedDB and automatically synchronized when back online.

### 🕒 Time-Travel Version History & 1-Click Rollback
- **Historical Snapshots**: Inspect past versions with timestamp, author metadata, and snapshot sizes.
- **Preview & Restore**: Preview historical document versions and revert changes instantly with 1-click.



## 📚 Documentation Index

For exhaustive technical breakdowns, consult the dedicated guides in the [`docs/`](docs/) directory:

- ⚡ [**Master Guide: Workflow & Issue Resolution Matrix**](docs/comprehensive-project-workflow-and-issue-resolution-guide.md) — Detailed breakdown of 5 core workflows and 9 distributed issue fixes.
- 📐 [**Distributed Systems Architecture & Data Flow**](docs/distributed-systems-architecture.md) — Mathematical proofs, CAP/PACELC analysis, State Vectors, and Redis mesh topologies.
- 🧠 [**Deep Dive: CRDT, Hocuspocus & Distributed Systems**](docs/deep-dive-crdt-hocuspocus-distributed-systems.md) — CRDT YATA internal mechanics vs raw WebSockets.
- 🐳 [**Docker Deployment & Containerization Guide**](docs/docker-deployment-guide.md) — Container optimization, Nginx reverse proxy, and environment configuration.
- 🧪 [**Offline-First Testing & Notion Editor Architecture**](docs/offline-testing-and-notion-editor-guide.md) — Offline replication scenarios and state vector reconciliation.
- ⌨️ [**Slash Command (`/`) Customization Guide**](docs/slash-command-customization-guide.md) — How to extend TipTap custom blocks and slash commands.
- 🔌 [**API & WebSocket Protocol Interface Specifications**](docs/api-and-websocket-contracts.md) — REST endpoint schemas and WebSocket binary handshake contracts.
