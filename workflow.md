# SyncCraft: Real-Time Collaborative Editor (CRDT + Yjs)

Hệ thống soạn thảo văn bản cộng tác thời gian thực (Collaborative Rich-Text Editor) chuẩn công nghiệp vận hành theo mô hình phân tán **CRDT (Conflict-free Replicated Data Type)** với thuật toán **YATA (Yjs)**, cơ chế lưu trữ **PostgreSQL** với **Write-Behind Debounced Compaction**, mở rộng ngang qua **Redis Pub/Sub**, và giao diện chuẩn Notion/Linear áp dụng phong cách thiết kế từ skill `design-taste-frontend`.

---

## 1. Tổng Quan Kiến Trúc & Stack Công Nghệ

```
+-----------------------------------------------------------------------------------+
|                                  CLIENT (BROWSER)                                 |
|  +-----------------------------------------------------------------------------+  |
|  | TipTap v2 Rich-Text Editor (React 19 + Tailwind CSS + Framer Motion)        |  |
|  | - Extensions: StarterKit, TaskList, Table, CodeBlockLowlight, BubbleMenu    |  |
|  | - Collaboration & CollaborationCursor Extensions                           |  |
|  +-----------------------------------------------------------------------------+  |
|                                         ▲                                         |
|                                         │ Binding trực tiếp                       |
|                                         ▼                                         |
|  +-----------------------------------------------------------------------------+  |
|  | Y.Doc (CRDT Core: Y.XmlFragment "default", UndoManager)                     |  |
|  +-----------------------------------------------------------------------------+  |
|                  ▲                                             ▲                  |
|                  │ (Local Cache)                               │ (Sync Binary)    |
|                  ▼                                             ▼                  |
|  +-------------------------------+             +-------------------------------+  |
|  | IndexedDB (y-indexeddb)       |             | Hocuspocus Provider (WS)      |  |
|  | Cache offline & khởi động 0ms |             | State Vector & Live Awareness |  |
|  +-------------------------------+             +-------------------------------+  |
+----------------------------------------------------------------┼------------------+
                                                                 │ WebSocket (JWT Auth)
                                                                 ▼
+-----------------------------------------------------------------------------------+
|                        BACKEND SYNC SERVER (HOCUSPOCUS + EXPRESS)                 |
|  - Room/Document Manager (In-memory Y.Doc per active doc)                         |
|  - onAuthenticate Hook (Xác thực JWT token & Phân quyền VIEWER / EDITOR / OWNER)  |
|  - State Vector Diff Sync & Binary Broadcast Engine                               |
|  - Ephemeral Awareness / Presence Distributor (Con trỏ chuột, bôi đen)             |
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

## 2. Dữ Liệu Phân Tán (Distributed Systems Data Flow)

### 2.1 Thuật Toán CRDT & Tính Chất Hội Tụ (Strong Eventual Consistency)
Mọi thao tác chỉnh sửa văn bản là một phép toán trên Bán Dàn (Join-Semilattice):
- **Giao hoán (Commutativity)**: $A \sqcup B = B \sqcup A$ $\rightarrow$ Nhận các gói update theo bất kỳ thứ tự nào qua mạng đều cho ra kết quả văn bản như nhau.
- **Kết hợp (Associativity)**: $(A \sqcup B) \sqcup C = A \sqcup (B \sqcup C)$ $\rightarrow$ Gom nhóm các update không làm sai lệch văn bản.
- **Bất biến lặp (Idempotency)**: $A \sqcup A = A$ $\rightarrow$ Gửi trùng gói tin khi mạng lag không gây nhân đôi chữ.

### 2.2 Quản Lý Nhân Quả & State Vector (Vector Clocks)
Mỗi phần tử ký tự gắn với bộ định danh:
$$\text{ID} = (\text{ClientID}, \text{LogicalClock})$$

Khi Client reconnect sau khi offline:
1. Client gửi `StateVector` tóm tắt (khoảng vài chục bytes):
   $$\text{StateVector}_{\text{client}} = \{ \text{Client}_1: 140, \text{Client}_2: 89 \}$$
2. Server chỉ trích xuất phần nhị phân (Binary Delta) chứa các update mà Client chưa có.
3. Cả hai bên merge qua `Y.applyUpdate()` mà **không cần tải lại toàn bộ tài liệu**, tiết kiệm 95% băng thông.

### 2.3 Cơ Chế Compaction Snapshot (Write-Behind)
Thay vì ghi vào database sau từng phím gõ (gây thắt cổ chai I/O):
- Hocuspocus gom các binary diff trong bộ nhớ RAM.
- Sau **3 giây debounce** kể từ lần gõ cuối cùng, server gọi `Y.encodeStateAsUpdate(ydoc)` để nén toàn bộ state thành 1 bản snapshot vào bảng `document_snapshots`.
- Dọn dẹp các dòng log cũ trong `document_update_logs`.

---

## 3. Danh Sách Tài Khoản & Dữ Liệu Mẫu (Seeder Mock Data)

Hệ thống đã có sẵn dữ liệu mẫu trong PostgreSQL (`collaborative_db`):

| Tên User | Email | Mật khẩu | Màu Presence / Vai trò | Tài liệu sở hữu |
| :--- | :--- | :--- | :--- | :--- |
| **Alice Chen** | `alice@example.com` | `password123` | `#6366f1` (Lead Engineer) | Owner của *"⚡ Architecture & Distributed Systems Spec"* |
| **Bob Martinez** | `bob@example.com` | `password123` | `#10b981` (Product Manager) | Owner của *"📋 Product Roadmap & Team Milestones 2026"* |
| **Charlie Davis** | `charlie@example.com` | `password123` | `#f59e0b` (UI/UX Designer) | Owner của *"🎨 Design System & Visual Hierarchy"* |
| **Diana Ross** | `diana@example.com` | `password123` | `#ec4899` (QA Engineer) | Editor trên Doc 1 & Doc 2 |

---

## 4. Hướng Dẫn Vận Hành & Khởi Chạy

### 4.1 Khởi tạo Database & Chạy Seeder
```bash
# Đồng bộ schema vào PostgreSQL
npm run prisma:push

# Chạy nạp dữ liệu mẫu (Users, Docs, Snapshots)
npm run seed
```

### 4.2 Khởi động Toàn Bộ Hệ Thống
```bash
# Chạy đồng thời cả Frontend (port 5173) và Backend (port 4000)
npm run dev
```

- **Frontend Client**: [http://localhost:5173](http://localhost:5173)
- **Backend REST API**: `http://localhost:4000`
- **Hocuspocus WebSocket Engine**: `ws://localhost:4000`

### 4.3 Chạy Bộ Kiểm Thử Toán Học CRDT
```bash
npm run test
```

---

## 5. Tài Liệu Kỹ Thuật Chi Tiết (References)
- [Distributed Systems Architecture & Data Flow](file:///c:/laragon/www/collaborative/docs/distributed-systems-architecture.md)
- [API & WebSocket Interface Specification](file:///c:/laragon/www/collaborative/docs/api-and-websocket-contracts.md)
- [Walkthrough & Verification Flow](file:///C:/Users/Go/.gemini/antigravity/brain/9aac5e43-4a89-4aa0-9093-00f4d8d88a38/walkthrough.md)