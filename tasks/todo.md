# Task List: Real-time Collaborative Editor (CRDT + Yjs)

## Phase 1: Foundation & Data Modeling

- [x] **Task 1: Monorepo & Project Structure Setup**
  - **Description:** Khởi tạo cấu trúc dự án full-stack (React 19 + TipTap v2 Frontend + Node.js/Express + Hocuspocus Backend) với TypeScript.
  - **Verification:** `npm run dev` chạy mượt mà ở cả client và server ports.

- [x] **Task 2: Database Schema & Migrations**
  - **Description:** Tạo schema Prisma cho PostgreSQL gồm bảng User, Document, DocumentPermission, DocumentSnapshot, và DocumentUpdateLog.
  - **Verification:** `npx prisma db push` và `npm run prisma:generate` thành công.

- [x] **Task 3: Authentication & Token Service**
  - **Description:** Xây dựng module xác thực JWT cấp token chứa UserID và quyền truy cập document để truyền qua WebSocket connection query.
  - **Verification:** Unit tests cho JWT generation và validation pass 100%.

- [x] **Task 3.1: Database Seeder & Mock Data**
  - **Description:** Tạo `server/prisma/seed.ts` nạp 4 user mẫu (Alice, Bob, Charlie, Diana) và 3 tài liệu CRDT phong phú kèm lịch sử snapshot.
  - **Verification:** `npm run seed` chạy thành công không có warning.

---

## Checkpoint 1: Foundation
- [x] Database migrations hoàn tất và kết nối thông suốt trên PostgreSQL `collaborative_db`.
- [x] Auth service tạo và verify token chính xác.
- [x] Dữ liệu mẫu (Users, Docs, Snapshots) đã được seed vào database.

---

## Phase 2: Backend Sync Engine

- [x] **Task 4: Hocuspocus Sync Server with Auth Hook**
  - **Description:** Cấu hình Hocuspocus Server với hook `onAuthenticate` để chặn kết nối không hợp lệ và kiểm tra quyền mở Room theo DocumentID.
  - **Verification:** Role VIEWER được cấp `readOnly: true`, EDITOR/OWNER được cấp read/write.

- [x] **Task 5: Persistence & Compaction Layer**
  - **Description:** Cài đặt hook `onLoadDocument` (load snapshot từ Postgres vào memory) và `onStoreDocument` (debounced 3s compaction lưu snapshot mới xuống database).
  - **Verification:** Tự động tạo snapshot version và prune log cũ.

- [x] **Task 6: Redis Scale-Out Extension**
  - **Description:** Tích hợp `@hocuspocus/extension-redis` để đồng bộ state giữa nhiều instance server chạy song song trên `127.0.0.1:6379`.
  - **Verification:** Module Redis tích hợp sẵn sàng trong Hocuspocus server.

---

## Checkpoint 2: Sync Engine
- [x] Server Hocuspocus nhận, broadcast và lưu trữ an toàn binary Yjs updates.
- [x] Multi-instance sync qua Redis hoạt động trơn tru.

---

## Phase 3: Frontend Rich-Text Editor & CRDT

- [x] **Task 7: TipTap Editor Core & Custom Extensions**
  - **Description:** Xây dựng giao diện soạn thảo rich-text hiện đại (Heading 1-3, Bold, Italic, Bullet/Numbered List, TaskList, Table, CodeBlockLowlight, Slash Command menu `/`, Floating Bubble Menu).
  - **Verification:** Giao diện tối giản, thanh lịch chuẩn Notion/Linear theo `design-taste-frontend`.

- [x] **Task 8: Yjs Integration & WebSocket Binding**
  - **Description:** Kết nối TipTap với `Y.Doc` và `@hocuspocus/provider`, đồng bộ hóa state 2 chiều theo thời gian thực.
  - **Verification:** Đồng bộ hóa diff nhị phân hai chiều liên tục.

- [x] **Task 9: Offline-First Support with IndexedDB**
  - **Description:** Cấu hình `y-indexeddb` để lưu cache tài liệu ở trình duyệt; hỗ trợ gõ offline và tự động hòa giải qua State Vector khi có mạng.
  - **Verification:** Khởi tạo tức thì từ IndexedDB khi mở tài liệu.

---

## Phase 4: Multi-User Collaboration & Presence

- [x] **Task 10: Multi-User Live Cursors & Selection**
  - **Description:** Tích hợp `@tiptap/extension-collaboration-cursor` và Yjs Awareness protocol để hiển thị con trỏ, tên và màu sắc đại diện của từng user đang gõ.
  - **Verification:** Awareness state phát sóng realtime qua memory WebSocket.

- [x] **Task 11: Active Collaborators Header & Sync Status Badge**
  - **Description:** Thiết kế thanh header hiển thị danh sách avatar người dùng đang online trong tài liệu và huy hiệu trạng thái (🟢 Saved / 🟡 Syncing / ⚪ Offline).
  - **Verification:** Avatar pile hiển thị presence dots và tooltips mượt mà.

- [x] **Task 12: Document Sharing & Version History Modals**
  - **Description:** Modal chia sẻ tài liệu (phân quyền Viewer/Editor, toggle public link) và Modal Version History với 1-click restore.
  - **Verification:** Xem snapshot cũ và khôi phục về phiên bản quá khứ thành công.

---

## Phase 5: Documentation, Polish & Verification

- [x] **Task 13: Automated CRDT Convergence Unit Tests**
  - **Description:** Viết test tự động kiểm tra tính chất Commutative, Associative, Idempotent của Yjs.
  - **Verification:** `npm run test` pass 6/6 tests.

- [x] **Task 14: Comprehensive Distributed Systems Documentation**
  - **Description:** Tạo tài liệu chuyên sâu `docs/distributed-systems-architecture.md`, `docs/api-and-websocket-contracts.md`, và cập nhật `workflow.md`.
  - **Verification:** Hoàn tất tài liệu chi tiết với sơ đồ kiến trúc, nguyên lý CAP, và bảng dữ liệu mẫu.
