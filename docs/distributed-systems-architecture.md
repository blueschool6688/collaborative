# Distributed Systems Architecture & Data Flow Specification

## 1. Executive Summary

**SyncCraft** is an industrial-grade, real-time collaborative rich-text editor designed to support concurrent multi-user editing, seamless offline-first workflows, and horizontal scalability.

Unlike legacy centralized architectures (such as Google Docs' central-server Operational Transformation), SyncCraft operates as a **Distributed Autonomous Replica System** leveraging **Conflict-free Replicated Data Types (CRDTs)** via the **YATA (Yjs)** algorithm.

---

## 2. Distributed Systems Theoretical Foundations

### 2.1 CAP & PACELC Theorem Mapping

```
+-----------------------------------------------------------------------------------+
|                                   CAP THEOREM                                     |
|                                                                                   |
|           Consistency (C)                      Availability (A) [CHOSEN]          |
|                 ▲                                      ▲                          |
|                 │                                      │                          |
|                 └──────────────────┬───────────────────┘                          |
|                                    │                                              |
|                                    ▼                                              |
|                         Partition Tolerance (P) [CHOSEN]                         |
+-----------------------------------------------------------------------------------+
```

- **CAP Choice: AP (Availability + Partition Tolerance)**
  - In collaborative rich-text editing, **Availability and Latency** are non-negotiable. Keystrokes must render instantly (<10ms) on the local screen without waiting for round-trip network acknowledgments or database transactions.
  - When network partitions occur (e.g., a client goes through a tunnel or loses Wi-Fi), the local node remains fully writable.
- **PACELC Theorem: `PA/EL`**
  - **If Partition (P)**: System chooses **Availability (A)** over immediate Consistency (C).
  - **Else (E)**: System prioritizes ultra-low **Latency (L)** for keystroke operations over synchronous server consensus (C).

---

### 2.2 Strong Eventual Consistency (SEC) & Mathematical Convergence

A distributed system achieves **Strong Eventual Consistency (SEC)** if all replicas that have received the same set of updates reach identical states, regardless of the order in which those updates were received.

SyncCraft CRDT updates form a **Bounded Join-Semilattice** $(\mathcal{S}, \sqcup)$ satisfying:

$$\begin{aligned}
\text{Commutativity:} \quad & A \sqcup B = B \sqcup A \\
\text{Associativity:} \quad & (A \sqcup B) \sqcup C = A \sqcup (B \sqcup C) \\
\text{Idempotency:} \quad & A \sqcup A = A
\end{aligned}$$

#### Practical Implication:
1. **Network Retries**: If WebSocket re-sends a binary diff packet 3 times due to flaky connection, $A \sqcup A \sqcup A = A$ prevents document corruption or character duplication.
2. **Out-of-Order Delivery**: If Packet B arrives before Packet A, $B \sqcup A = A \sqcup B$ guarantees convergence to the exact same text buffer across all clients.
3. **Zero Single-Point-of-Failure**: No central locking or leader election is required to determine the order of keystrokes.

---

### 2.3 Causality, Logical Clocks & State Vectors

Each character or block node in the Yjs CRDT structure is uniquely identified by a tuple:

$$\text{Item ID} = (\text{ClientID}, \text{LogicalClock})$$

Where `ClientID` is a unique 53-bit integer and `LogicalClock` is a monotonically increasing Lamport timestamp.

#### State Vector Representation:
A **State Vector** summaries the latest clock seen from all known peers:

$$\text{StateVector} = \{ \text{Client}_A: 412, \ \text{Client}_B: 108, \ \text{Client}_C: 955 \}$$

#### Bidirectional Diff Synchronization Algorithm:
When Client $X$ connects or reconnects to Server $S$:
1. Client $X$ transmits its compact $\text{StateVector}_X$ (a few dozen bytes).
2. Server $S$ evaluates the difference:
   $$\Delta_{S \to X} = \text{ExtractUpdates}(\text{YDoc}_S, \text{StateVector}_X)$$
3. Server $S$ streams only the missing binary delta $\Delta_{S \to X}$ to Client $X$.
4. Concurrently, Server $S$ provides $\text{StateVector}_S$ and Client $X$ replies with $\Delta_{X \to S}$.
5. Both sides apply updates locally via `Y.applyUpdate()`, reaching mathematical parity instantly with minimal bandwidth.

---

## 3. High-Level Data Flow Architecture

```
+-------------------------------------------------------------------------------------------------+
|                                         CLIENT TIERS                                            |
|                                                                                                 |
|   +--------------------------+                                 +--------------------------+     |
|   |  Browser Client 1 (Alice)|                                 |  Browser Client 2 (Bob)  |     |
|   |  - TipTap Editor Engine  |                                 |  - TipTap Editor Engine  |     |
|   |  - Local Y.Doc           |                                 |  - Local Y.Doc           |     |
|   |  - y-indexeddb Cache     |                                 |  - y-indexeddb Cache     |     |
|   +-------------┬------------+                                 +-------------┬------------+     |
+-----------------┼─────────────────────────────────────────────────────────────┼-----------------+
                  │ WebSocket (Binary Diffs)                                    │ WebSocket (Binary Diffs)
                  │ ws://server-node-1:4000                                     │ ws://server-node-2:4000
                  ▼                                                             ▼
+-------------------------------------------------+             +---------------------------------+
|          SERVER NODE 1 (Hocuspocus)             |             |   SERVER NODE 2 (Hocuspocus)    |
|  - Room Manager (In-Memory Y.Doc)               |             |  - Room Manager                 |
|  - onAuthenticate (JWT + Role Authorization)    |             |  - onAuthenticate (JWT)         |
|  - Write-Behind Compaction Engine               |             |  - Write-Behind Compaction      |
+-----------------------┬-------------------------+             +----------------┬----------------+
                        │                                                        │
                        │                    REDIS CLUSTER PUB/SUB               │
                        └───────────────► (Channel: `doc:<documentId>`) ◄────────┘
                                                         │
                                        Write-Behind (Debounced 3s)
                                                         │
                                                         ▼
                                       +-----------------------------------+
                                       |        POSTGRESQL DATABASE        |
                                       |  - users                          |
                                       |  - documents                      |
                                       |  - document_permissions           |
                                       |  - document_snapshots (Compacted) |
                                       |  - document_update_logs (Deltas)  |
                                       +-----------------------------------+
```

---

## 4. Plane Separation: Data Plane vs Control Plane

| Dimension | Data Plane (Persistent Storage) | Control Plane (Ephemeral Signaling) |
| :--- | :--- | :--- |
| **Payload Type** | Document text, tables, tasks, headings | Cursor positions, selections, user name, color |
| **Transport** | Yjs Binary Update (`Uint8Array`) | Yjs Awareness Protocol (`y-protocols/awareness`) |
| **Durability** | Permanent (PostgreSQL + IndexedDB) | Memory-only (Disappears on disconnect / TTL) |
| **Write Strategy** | Debounced 3s Compaction Snapshot | Throttled 50ms peer broadcast |
| **Fault Tolerance** | Strict ACID on snapshot persistence | Best-effort real-time stream |

---

## 5. Persistence & Write-Behind Compaction Mechanics

### 5.1 The Write Amplification Problem
If every keystroke triggered a database `INSERT`, a fast typist (80 WPM) across 10 concurrent users would generate **4,000 DB writes per minute**, causing excessive I/O bottleneck and transaction lock overhead.

### 5.2 Compaction Solution
SyncCraft employs a **Write-Behind Debounced Compaction Pipeline**:

```
[Keystrokes] ──► [In-Memory Y.Doc] ──► [Broadcast to WS Peers]
                         │
                    3s Debounce Window (Timer resets on new edit)
                         │
                         ▼
             [Y.encodeStateAsUpdate(ydoc)]
                         │
                         ├──► 1. Save compacted snapshot to `document_snapshots` (v+1)
                         ├──► 2. Delete older entries in `document_update_logs`
                         └──► 3. Update `documents.updatedAt` timestamp
```

#### Database Schema Model:
```prisma
model DocumentSnapshot {
  id         String   @id @default(cuid())
  documentId String
  snapshot   Bytes    // Compacted Y.Doc binary state
  version    Int      @default(1)
  size       Int      // Byte count for history inspection
  createdBy  String?
  createdAt  DateTime @default(now())

  @@index([documentId, createdAt(sort: Desc)])
}

model DocumentUpdateLog {
  id         String   @id @default(cuid())
  documentId String
  update     Bytes    // Incremental binary delta
  clock      Int      @default(0)
  createdAt  DateTime @default(now())

  @@index([documentId, createdAt(sort: Asc)])
}
```

---

## 6. Horizontal Scalability via Redis Mesh

When running multiple backend instances behind a Load Balancer:
1. **Client A** is connected to **Server Node 1**.
2. **Client B** is connected to **Server Node 2**.
3. Both clients are editing Document `cm6xoy7vg0005n4112x8p8w1d`.
4. When Client A inserts text, **Server Node 1**:
   - Merges update into its local in-memory `Y.Doc`.
   - Broadcasts the binary update to its locally connected peers.
   - Publishes the binary packet to Redis channel `hocuspocus:document:cm6xoy7vg0005n4112x8p8w1d`.
5. **Server Node 2** receives the Redis Pub/Sub message:
   - Ingests the update into its local in-memory `Y.Doc`.
   - Emits the binary packet to Client B over WebSocket.
6. The entire round-trip latency across distributed nodes is typically **< 15ms**.

---

## 7. Failure Modes & Self-Healing Scenarios

### Scenario A: Temporary Network Disconnect (Offline Mode)
- **Action**: User continues typing while offline on an airplane.
- **Handling**: `IndexeddbPersistence` saves every transaction to browser storage.
- **Healing**: Upon regaining internet, Hocuspocus reconnects, exchanges state vectors, and merges offline edits without overriding concurrent edits made by online peers.

### Scenario B: Server Node Crash
- **Action**: Server Node 1 experiences hardware fault or process restart.
- **Handling**: Load balancer routes clients to Server Node 2.
- **Healing**: Server Node 2 triggers `onLoadDocument`, reads the latest `DocumentSnapshot` from PostgreSQL, applies any remaining delta logs, and resumes live collaboration seamlessly.

### Scenario C: Simultaneous Conflicting Formats
- **Action**: Alice bolds a paragraph while Bob deletes the same paragraph at the exact same millisecond.
- **Handling**: YATA CRDT marks the deleted node as tombstoned. The deletion takes precedence deterministically across all nodes without race conditions or error dialogs.
