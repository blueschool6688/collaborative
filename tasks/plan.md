# Implementation Plan: Production-Ready Real-time Collaborative Editor (CRDT + Yjs)

## Overview
Xây dựng hệ thống soạn thảo cộng tác thời gian thực (Collaborative Rich-text Editor) chuẩn công nghiệp, lấy cảm hứng từ Notion và Google Docs. Hệ thống vận hành trên nguyên lý **CRDT (Conflict-free Replicated Data Type)** với thuật toán **YATA (Yjs)**, kiến trúc **Offline-First**, đồng bộ qua **Hocuspocus WebSocket Server**, lưu trữ **PostgreSQL** (incremental updates + periodic snapshot compaction), và hỗ trợ mở rộng phân tán qua **Redis Pub/Sub**.

---

## Architecture & System Design

```
+-----------------------------------------------------------------------------------+
|                                  CLIENT (BROWSER)                                 |
|  +-----------------------------------------------------------------------------+  |
|  | TipTap v2 Editor (ProseMirror Engine)                                       |  |
|  | - Collaboration & CollaborationCursor Extensions                           |  |
|  +-----------------------------------------------------------------------------+  |
|                                         ▲                                         |
|                                         │ Direct Binding                          |
|                                         ▼                                         |
|  +-----------------------------------------------------------------------------+  |
|  | Y.Doc (CRDT Core: Y.XmlFragment, UndoManager)                               |  |
|  +-----------------------------------------------------------------------------+  |
|                  ▲                                             ▲                  |
|                  │ (Local Cache)                               │ (Sync Binary)    |
|                  ▼                                             ▼                  |
|  +-------------------------------+             +-------------------------------+  |
|  | IndexedDB (y-indexeddb)       |             | Hocuspocus Provider (WS)      |  |
|  | Offline persistence & storage |             | State Vector & Awareness      |  |
|  +-------------------------------+             +-------------------------------+  |
+----------------------------------------------------------------┼------------------+
                                                                 │ WebSocket (JWT Auth)
                                                                 ▼
+-----------------------------------------------------------------------------------+
|                        BACKEND SYNC SERVER (HOCUSPOCUS / NODE.JS)                 |
|  - Room/Document Manager (In-memory Y.Doc per active doc)                         |
|  - Auth Hook (Validate JWT, check document read/write permissions)                 |
|  - State Vector Diff Sync & Binary Broadcast Engine                               |
|  - Ephemeral Awareness / Presence Distributor                                     |
|  - Compaction Engine: Y.encodeStateAsUpdate() & snapshot flush                    |
+------------------------------┬---------------------------------┬------------------+
                               │                                 │
                 Pub/Sub Sync  │                                 │ Persistence Hook
                               ▼                                 ▼
               +-------------------------------+ +--------------------------------+
               | Redis Cluster (Pub/Sub)       | | PostgreSQL Database            |
               | - Multi-server instance sync  | | - users, documents, permissions|
               | - Ephemeral room metadata     | | - doc_updates (binary diffs)   |
               |                               | | - doc_snapshots (compacted)    |
               +-------------------------------+ +--------------------------------+
```

---

## Recommended Tech Stack

| Layer | Công nghệ đề xuất | Lý do & Vai trò |
| :--- | :--- | :--- |
| **Frontend Framework** | **Next.js 15+ (App Router)** / **Vite + React 19** + TypeScript | SSR cho UI/Auth, tối ưu tải trang, chuẩn bị routing linh hoạt. |
| **Rich-Text Engine** | **TipTap v2** + `@tiptap/extension-collaboration` | Headless, dễ tùy biến giao diện, tích hợp sâu và chính thức với Yjs. |
| **CRDT Core** | **Yjs** (`yjs`, `y-protocols`, `y-indexeddb`) | Thuật toán YATA tối ưu cho text, hiệu năng cao nhất trong các CRDT JS. |
| **Transport & Sync** | **Hocuspocus Server & Client** (`@hocuspocus/server`) | Framework chuyên dụng cho Yjs, quản lý room, auth, debounce persistence. |
| **Styling & Icons** | **Tailwind CSS + Lucide Icons** | Giao diện tối giản, thanh lịch chuẩn Notion/Linear, hỗ trợ Dark/Light mode. |
| **Database & ORM** | **PostgreSQL** + **Prisma ORM** / **Drizzle ORM** | Lưu trữ metadata văn bản, phân quyền và binary snapshot (`bytea`). |
| **Horizontal Scale** | **Redis** (`@hocuspocus/extension-redis` / `ioredis`) | Đồng bộ giữa các node server khi scale ngang nhiều instance. |
| **Authentication** | **JWT / NextAuth / Lucia Auth** | Xác thực user và cấp quyền truy cập document qua token handshake WebSocket. |
| **Testing** | **Playwright** + **Vitest** | Test multi-browser collaborative editing, test tính hội tụ (convergence) của CRDT. |

---

## Key Architecture Decisions (ADRs)

1. **CRDT (Yjs) thay vì OT (Operational Transformation)**:
   - *Lý do*: Loại bỏ điểm nghẽn single-source-of-truth ở server; hỗ trợ hoàn hảo Offline-first và P2P mà không bị rủi ro conflict resolution phức tạp hay desync khi mạng chập chờn.
2. **Hocuspocus thay vì raw `y-websocket`**:
   - *Lý do*: Hocuspocus cung cấp sẵn hooks cho Authentication (`onAuthenticate`), Document Loading (`onLoadDocument`), Persistence debouncing (`onStoreDocument`), Extension Redis scale-out, giúp tiết kiệm hàng trăm giờ code boilerplate WebSocket.
3. **Chiến lược Snapshot Compaction**:
   - *Lý do*: Lưu từng keystroke binary diff sẽ làm database phình to nhanh chóng. Áp dụng chiến lược: Ghi binary updates vào cache/buffer; sau mỗi 100 updates hoặc 5 phút idle, gọi `Y.encodeStateAsUpdate()` để nén thành 1 bản snapshot duy nhất, dọn dẹp các update log cũ.
4. **Tách biệt Data Sync và Awareness**:
   - *Lý do*: Con trỏ chuột, selection, trạng thái online là dữ liệu tạm thời (ephemeral), chỉ phát sóng qua memory WebSocket, tuyệt đối không ghi vào Database để tránh nghẽn I/O.

---

## Distributed Systems Principles Applied in this Project

Hệ thống Collaborative Editor này là một ứng dụng kinh điển của **Hệ Thống Phân Tán (Distributed Systems)** cấp độ cao. Dưới đây là cách các nguyên lý phân tán cốt lõi được áp dụng:

### 1. Định lý CAP & Định lý PACELC
- **CAP Theorem (AP > CP)**: 
  - Trong kịch bản người dùng soạn thảo văn bản, độ trễ và tính sẵn sàng (Availability) là ưu tiên tuyệt đối. Trình biên tập không thể bị "khóa" (block) khi mạng chập chờn hoặc rớt mạng.
  - Do đó, hệ thống chọn **AP (Availability + Partition Tolerance)**: Mỗi client là một nút phân tán (replica) có khả năng chấp nhận thao tác ghi (writes) độc lập và cục bộ ngay cả khi bị phân mảnh mạng (network partition / offline).
- **PACELC Theorem**: `PA/EL`
  - Khi có sự cố mạng (**P**artition): Hệ thống chọn tính sẵn sàng (**A**vailability) thay vì tính nhất quán tức thời (**C**onsistency).
  - Khi mạng bình thường (**E**lse): Hệ thống ưu tiên độ trễ cực thấp (**L**atency) cho người dùng gõ phím thay vì chờ đồng thuận nhất quán tức thời (**C**onsistency).

### 2. Strong Eventual Consistency (SEC) & Bán dàn toán học (Semi-Lattice)
- Các hệ thống phân tán truyền thống (Eventual Consistency) thường phải giải quyết xung đột bằng cách "Last-Write-Wins" (dễ mất dữ liệu) hoặc "Manual Merge".
- Dự án này đạt mức **Strong Eventual Consistency (SEC)** thông qua cấu trúc dữ liệu **CRDT (CvRDT/Pn-Counter/YATA)**:
  - **Commutative (Giao hoán)**: $A \star B = B \star A$ (Nhận update theo thứ tự nào cũng cho ra kết quả như nhau).
  - **Associative (Kết hợp)**: $(A \star B) \star C = A \star (B \star C)$ (Gộp các nhóm update không làm đổi trạng thái).
  - **Idempotent (Chiếu vật / Bất biến khi lặp)**: $A \star A = A$ (Gửi trùng lặp binary update do mạng retry không làm sai lệch văn bản).
- Nhờ 3 tính chất trên, mọi bản sao phân tán đều **hội tụ toán học** về đúng 1 trạng thái duy nhất mà không cần một server "trọng tài" giải quyết xung đột.

### 3. Phi tập trung hóa thứ tự (No Raft / Paxos Consensus Overhead)
- Các cơ sở dữ liệu phân tán (như CockroachDB, etcd) cần giao thức đồng thuận (Consensus Protocol như Raft/Paxos) với chi phí round-trip latency lớn để quyết định "ai ghi trước, ai ghi sau".
- Trong hệ thống này:
  - Mỗi phần tử (ký tự, khối văn bản) được định danh duy nhất bởi bộ đôi: `(ClientID, LogicalClock)` (tương tự **Lamport Timestamps**).
  - Quy tắc tie-breaking cục bộ của thuật toán YATA đảm bảo toàn bộ các nút phân tán tự sắp xếp thứ tự giống nhau một cách tất định (deterministic) mà không cần trao đổi biểu quyết.

### 4. Vector Clocks & State Vectors (Quản lý quan hệ nhân quả - Causality)
- Để đồng bộ giữa hai node sau khi mất kết nối, hệ thống sử dụng **State Vector** (bản đồ lưu trữ clock cao nhất đã biết của từng `ClientID`):
  $$\text{StateVector} = \{ \text{Client}_1: 152, \text{Client}_2: 89, \text{Client}_3: 310 \}$$
- Khi Client A kết nối lại Server B:
  1. Client A gửi `StateVector_A` cho Server B.
  2. Server B chỉ trích xuất phần nhị phân (Binary Delta) chứa các operations mà Client A chưa từng thấy ($Clock > \text{StateVector}_A$).
  3. Quá trình diễn ra 2 chiều mà không cần truyền tải lại toàn bộ nội dung tài liệu, tiết kiệm tối đa băng thông mạng.

### 5. Kiến trúc Mở Rộng Phân Tán (Horizontal Scale & Sharding Topology)
- **Room-based Sharding**: Mỗi tài liệu (`DocumentID`) hoạt động như một phân vùng (partition) hoàn toàn độc lập.
- **Mesh Synchronization qua Redis Pub/Sub**:
  - Khi Client 1 kết nối đến Server Node A và Client 2 kết nối đến Server Node B:
  - Server Node A nhận binary update từ Client 1 $\rightarrow$ Merge vào local in-memory Y.Doc $\rightarrow$ Publish lên kênh Redis `channel:doc:<DocumentID>`.
  - Server Node B subscribe kênh trên $\rightarrow$ Nhận update $\rightarrow$ Merge và broadcast qua WebSocket xuống Client 2.

### 6. Tách biệt Hai Mặt Phẳng: Data Plane vs Control Plane
- **Data Plane (Persistent Storage)**:
  - Luồng nội dung tài liệu mang tính chất lâu dài (Durability).
  - Sử dụng chiến lược **Write-Behind / Debounced Compaction**: Tập hợp các binary diffs trong memory, định kỳ nén thành snapshot và ghi xuống PostgreSQL.
- **Control Plane (Ephemeral Signaling - Awareness)**:
  - Luồng con trỏ chuột, vị trí bôi đen, nhịp tim (heartbeat) có tần suất cao nhưng ngắn hạn.
  - Sử dụng cơ chế TTL / In-memory broadcast; tự động thu dọn (Garbage Collection) khi node mất kết nối mà không tạo tải (I/O bottleneck) lên cơ sở dữ liệu.

---

## Phased Task Breakdown

### Phase 1: Core Foundation & Database Modeling
- [ ] **Task 1.1**: Thiết lập project monorepo/polyrepo (Frontend Next.js/Vite + Backend Hocuspocus Server + TypeScript).
- [ ] **Task 1.2**: Thiết kế Database Schema (Users, Documents, DocumentPermissions, DocumentSnapshots, DocumentUpdateLogs) bằng Prisma/Drizzle.
- [ ] **Task 1.3**: Thiết lập cơ chế Auth (JWT Token generation & validation).

### Phase 2: Backend Sync Engine (Hocuspocus + Persistence + Redis)
- [ ] **Task 2.1**: Khởi tạo Hocuspocus Server với custom hooks (`onAuthenticate`, `onLoadDocument`, `onStoreDocument`).
- [ ] **Task 2.2**: Cài đặt Persistence Layer với PostgreSQL (load initial snapshot, debounced write-back, compaction).
- [ ] **Task 2.3**: Tích hợp Redis Pub/Sub Extension để hỗ trợ multi-instance scaling.

### Phase 3: Frontend Rich-Text Editor & CRDT Integration
- [ ] **Task 3.1**: Xây dựng UI Editor Workspace (TipTap v2 + Floating Toolbar, Bubble Menu, Slash Commands `/`, Heading, Lists, CodeBlock).
- [ ] **Task 3.2**: Bind TipTap với `Y.Doc` và kết nối Hocuspocus Provider qua WebSocket.
- [ ] **Task 3.3**: Cài đặt `y-indexeddb` để kích hoạt chế độ Offline-First (instant loading từ local DB, tự động sync state vector khi online).

### Phase 4: Multi-User Collaboration & Presence
- [ ] **Task 4.1**: Cấu hình `@tiptap/extension-collaboration-cursor` và Yjs Awareness (avatar người dùng, con trỏ thời gian thực với màu sắc ngẫu nhiên/theo user, selection highlight).
- [ ] **Task 4.2**: Thanh hiển thị Collaborators Bar (danh sách user đang active trong doc, tooltip thông tin, trạng thái kết nối Online/Offline/Syncing).
- [ ] **Task 4.3**: Quản lý Document Sharing & Permission Modal (Viewer / Editor / Owner).

### Phase 5: Production Polish, History & Verification
- [ ] **Task 5.1**: Xây dựng Version History / Time Travel cơ bản dựa trên snapshot metadata.
- [ ] **Task 5.2**: Viết bộ test tự động (Vitest cho Yjs state merge & Playwright cho 2-tab multi-user real-time collaboration).
- [ ] **Task 5.3**: Container hóa với Docker Compose (App, Hocuspocus, Postgres, Redis).

---

## Risks & Mitigations

| Rủi ro | Mức độ | Biện pháp giảm thiểu |
| :--- | :--- | :--- |
| **Document Update Log phình to** | Cao | Tự động compact Y.Doc snapshot định kỳ và xóa diff log cũ khi snapshot đã persist. |
| **Mất kết nối mạng đột ngột** | Trung bình | `y-indexeddb` giữ toàn bộ bản sửa đổi; Hocuspocus client tự retry với exponential backoff. |
| **Xung đột con trỏ / Awareness giật lag** | Thấp | Debounce awareness broadcast (50ms) để tiết kiệm băng thông WebSocket. |
| **Rò rỉ quyền truy cập doc** | Cao | Kiểm tra token và quyền document ngay tại hook `onAuthenticate` trước khi cấp phép join room. |
