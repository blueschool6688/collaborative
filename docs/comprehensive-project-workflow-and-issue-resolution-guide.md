# ⚡ TỔNG HỢP TOÀN DIỆN: WORKFLOW DỰ ÁN & CÁC VẤN ĐỀ KỸ THUẬT (ISSUES & RESOLUTIONS)

Tài liệu này là **bản tổng hợp kỹ thuật hoàn chỉnh và chi tiết nhất** về toàn bộ luồng vận hành (**End-to-End Workflow**), cơ chế hệ thống phân tán (**Distributed Systems**), và ma trận giải quyết tất cả các vấn đề hóc búa (**Issues Handling Matrix**) trong dự án **SyncCraft** (Collaborative Rich-Text Workspace).

---

## 📑 MỤC LỤC TỔNG QUAN

1. [Bản Đồ Kiến Trúc Hệ Thống (Architecture & Tech Stack)](#1-bản-đồ-kiến-trúc-hệ-thống-architecture--tech-stack)
2. [Chi Tiết 5 Luồng Vận Hành Trọng Tâm (End-to-End Workflows)](#2-chi-tiết-5-luồng-vận-hành-trọng-tâm-end-to-end-workflows)
   - [Workflow 1: Xác thực & Phân quyền đa kênh (Auth & RBAC)](#workflow-1-xác-thực--phân-quyền-đa-kênh-auth--rbac)
   - [Workflow 2: Vòng đời kết nối WebSocket (Hocuspocus Lifecycle)](#workflow-2-vòng-đời-kết-nối-websocket-hocuspocus-lifecycle)
   - [Workflow 3: Soạn thảo cộng tác thời gian thực (Real-time Multiplayer)](#workflow-3-soạn-thảo-cộng-tác-thời-gian-thực-real-time-multiplayer)
   - [Workflow 4: Cơ chế Lưu trữ & Snapshot Compaction (Write-Behind Persistence)](#workflow-4-cơ-chế-lưu-trữ--snapshot-compaction-write-behind-persistence)
   - [Workflow 5: Quản trị hệ thống & Kiểm toán (Super Admin Governance & Audit)](#workflow-5-quản-trị-hệ-thống--kiểm-toán-super-admin-governance--audit)
3. [Ma Trận Xử Lý 9 Vấn Đề Kỹ Thuật Lớn (Issues & Resolutions Matrix)](#3-ma-trận-xử-lý-9-vấn-đề-kỹ-thuật-lớn-issues--resolutions-matrix)
   - [Issue 1: Hai người cùng sửa / chèn vào cùng 1 ký tự / vị trí](#issue-1-hai-người-cùng-sửa--chèn-vào-cùng-1-ký-tự--vị-trí)
   - [Issue 2: Xử lý khi mất hoàn toàn Internet (Offline-First Resilience)](#issue-2-xử-lý-khi-mất-hoàn-toàn-internet-offline-first-resilience)
   - [Issue 3: Xung đột Một người Xóa - Một người Sửa/Format (Delete vs Edit Race Condition)](#issue-3-xung-đột-một-người-xóa---một-người-sửaformat-delete-vs-edit-race-condition)
   - [Issue 4: Chống lặp gói tin và lệch thứ tự gói khi mạng chập chờn (Idempotency & Commutativity)](#issue-4-chống-lặp-gói-tin-và-lệch-thứ-tự-gói-khi-mạng-chập-chờn-idempotency--commutativity)
   - [Issue 5: Xung đột Undo/Redo giữa nhiều người dùng (Multiplayer Undo Isolation)](#issue-5-xung-đột-undoredo-giữa-nhiều-người-dùng-multiplayer-undo-isolation)
   - [Issue 6: Tối ưu hiệu năng Editor, triệt tiêu Lag gõ phím và Re-render thừa](#issue-6-tối-ưu-hiệu-năng-editor-triệt-tiêu-lag-gõ-phím-và-re-render-thừa)
   - [Issue 7: Nghẽn cổ chai Database I/O khi hàng ngàn người gõ phím cùng lúc](#issue-7-nghẽn-cổ-chai-database-io-khi-hàng-ngàn-người-gõ-phím-cùng-lúc)
   - [Issue 8: Phân quyền Super Admin mở và sửa trực tiếp Document Private của người khác](#issue-8-phân-quyền-super-admin-mở-và-sửa-trực-tiếp-document-private-của-người-khác)
   - [Issue 9: Hiện tượng DevTools Offline giữa 2 tab bị dính BroadcastChannel nội bộ](#issue-9-hiện-tượng-devtools-offline-giữa-2-tab-bị-dính-broadcastchannel-nội-bộ)
4. [Bộ Kiểm Thử Tự Động Hóa (Vitest Test Suite - 23/23 Tests)](#4-bộ-kiểm-thử-tự-động-hóa-vitest-test-suite---2323-tests)

---

## 1. BẢN ĐỒ KIẾN TRÚC HỆ THỐNG (ARCHITECTURE & TECH STACK)

```
+---------------------------------------------------------------------------------------+
|                                    CLIENT TIER (BROWSER)                              |
|                                                                                       |
|   [React 19 + Tailwind CSS + Framer Motion]                                           |
|                           │                                                           |
|   [TipTap v2 Rich-Text Editor] (StarterKit, Table, TaskList, Lowlight, Slash Menu)    |
|                           │                                                           |
|   [Yjs CRDT Data Model] (Y.Doc, Y.XmlFragment "default", Y.UndoManager)               |
|              ▲                                                    ▲                   |
|              │ (Local Storage)                                    │ (Binary Sync)     |
|              ▼                                                    ▼                   |
|   [y-indexeddb Persistence]                             [Hocuspocus Provider]         |
|   - 0ms Offline Cache                                   - Binary State Vector Sync    |
|   - Vĩnh viễn trên Client Disk                          - Ephemeral Awareness Cursors |
+-------------------------------------------------------------------┼-------------------+
                                                                    │ WebSocket (JWT)
                                                                    ▼
+---------------------------------------------------------------------------------------+
|                              BACKEND CLUSTER TIER (NODE.JS / TS)                      |
|                                                                                       |
|   [Express HTTP REST API] (Port 4000)      [Hocuspocus WebSocket Engine]              |
|   - Auth / OAuth / Token verification      - Connection Handshake & Auth Hook         |
|   - Document Directory CRUD                - In-Memory Document Rooms (Y.Doc)         |
|   - Super Admin Governance & Telemetry     - State Vector Diffing & Update Broadcast  |
|                                            - Debounced Compaction Engine (3000ms)     |
+---------------------------------------┬---------------------------┬-------------------+
                                        │                           │
                    Horizontal Scale    │                           │ Persistence Hook
                    Pub/Sub Broadcast   ▼                           ▼
              +-----------------------------------+   +---------------------------------+
              | Redis Cluster (Port 6379)         |   | PostgreSQL Database (Prisma)    |
              | - Inter-server synchronization    |   | - users, documents, permissions |
              | - Real-time room multicasting     |   | - document_snapshots (nén)      |
              | - Ephemeral presence channel      |   | - document_update_logs (delta)  |
              +-----------------------------------+   +---------------------------------+
```

---

## 2. CHI TIẾT 5 LUỒNG VẬN HÀNH TRỌNG TÂM (END-TO-END WORKFLOWS)

### Workflow 1: Xác thực & Phân quyền đa kênh (Auth & RBAC)
1. **Đăng nhập Local**: Người dùng gửi Email/Password $\rightarrow$ Server kiểm tra `bcrypt.compare()` $\rightarrow$ Trả về JWT Token chứa `userId`, `email`, `name`, `systemRole`.
2. **Đăng nhập OAuth (Google/GitHub)**: Client gửi payload định danh $\rightarrow$ Endpoint `/api/auth/oauth` tự động thực hiện *Upsert* (tạo mới tài khoản nếu chưa có hoặc liên kết tài khoản đã tồn tại) $\rightarrow$ Cấp JWT Token.
3. **Phân quyền vai trò hệ thống**:
   - `systemRole: "USER"`: Chỉ quản lý và mở các tài liệu do mình sở hữu hoặc được người khác share.
   - `systemRole: "ADMIN"`: Truy cập cổng quản trị `/admin`, xem thống kê RAM/Uptime, chỉnh sửa runtime settings, và có quyền can thiệp vào toàn bộ tài liệu trên hệ thống.

---

### Workflow 2: Vòng đời kết nối WebSocket (Hocuspocus Lifecycle)
Mỗi khi người dùng mở 1 Document (ví dụ `doc_123`):
1. **Handshake & Token Verification**: Client khởi tạo WebSocket kết nối tới `ws://localhost:4000`. Hook `onAuthenticateHook` trích xuất JWT Token, kiểm tra tài liệu trong Database:
   - Nếu `systemRole === "ADMIN"` $\rightarrow$ Cấp quyền `userRole = "OWNER"`.
   - Nếu là Owner tài liệu $\rightarrow$ Cấp quyền `userRole = "OWNER"`.
   - Nếu nằm trong danh sách Share $\rightarrow$ Cấp quyền `userRole = "EDITOR"` hoặc `"VIEWER"`.
   - Nếu tài liệu Public $\rightarrow$ Cấp quyền `defaultRole` (khách vãng lai).
   - Nếu không có quyền $\rightarrow$ Ngắt kết nối với mã lỗi `403 Unauthorized`.
2. **Cấp cờ ReadOnly**: Nếu `userRole === "VIEWER"`, server gán `connection.readOnly = true`. Mọi gói tin chỉnh sửa gửi từ client này sẽ bị server loại bỏ ngay lập tức.
3. **Nạp dữ liệu vào RAM (`onLoadDocument`)**: Server tìm Snapshot mới nhất trong bảng `document_snapshots` $\rightarrow$ Nạp binary vào `Y.Doc` trong bộ nhớ RAM của Server. Nếu Room đã có sẵn trong RAM từ trước, dùng lại instance đó.
4. **Giải phóng RAM (`onDisconnect`)**: Khi toàn bộ người dùng rời khỏi phòng, Server giữ snapshot trong DB và hủy `Y.Doc` instance trong RAM để tránh rò rỉ bộ nhớ (Garbage Collection).

---

### Workflow 3: Soạn thảo cộng tác thời gian thực (Real-time Multiplayer)

```
[1. User A gõ phím "H"]
        │
        ▼ (0ms - Không độ trễ)
[2. ProseMirror Document Local Mutation] ───> Giao diện trên máy A hiển thị chữ "H" ngay lập tức
        │
        ▼
[3. Yjs Y.XmlFragment tạo Item Node (ClientID: A, Clock: 101)]
        │
        ▼ (Gói tin Binary 30 bytes)
[4. WebSocket gửi binary update lên Hocuspocus Server]
        │
        ├─────────────────────────────────────────┐
        ▼                                         ▼
[5. Server áp dụng vào RAM Y.Doc]        [6. Redis Pub/Sub broadcast sang Server Node khác]
        │                                         │
        ▼                                         ▼
[7. Broadcast Binary Update tới User B] ───> [8. User B applyUpdate(ydoc)] ───> Hiện chữ "H" (5-15ms)
```

1. **Local Optimistic Mutation (0ms)**: Khi User A gõ phím, TipTap/ProseMirror cập nhật DOM ngay lập tức. User A không phải chờ mạng.
2. **CRDT Delta Generation**: Yjs tạo binary delta đóng gói: ID `(ClientID, Clock)`, con trỏ `originLeft`, `originRight`, và nội dung chữ.
3. **Multicasting**: Server nhận delta, áp dụng vào In-Memory `Y.Doc`, đồng thời chuyển tiếp tức thì tới tất cả các client đang online trong phòng qua WebSocket (và qua Redis Pub/Sub nếu chạy cụm nhiều server).
4. **Live Cursors (Awareness)**: Tọa độ con trỏ chuột, vùng chọn text, và thông tin tên/màu sắc của từng user được truyền tải qua kênh Awareness với chu kỳ throttle 50ms, tự động dọn dẹp khi user đóng tab.

---

### Workflow 4: Cơ chế Lưu trữ & Snapshot Compaction (Write-Behind Persistence)

Nhằm giải quyết bài toán: **Không thể ghi đĩa Database sau mỗi ký tự gõ phím (sẽ làm sập DB)**, hệ thống áp dụng cơ chế **Debounced Write-Behind Compaction**:

1. **Giai đoạn gõ liên tục**: Các thao tác gõ phím chỉ trao đổi trong bộ nhớ RAM và được ghi tạm thành các mẩu delta nhỏ trong bảng `document_update_logs`.
2. **Bộ đếm thời gian Debounce 3000ms**: Server theo dõi hoạt động trong phòng. Nếu sau **3 giây** không có thêm thao tác gõ nào phát sinh (người dùng tạm dừng suy nghĩ):
   - Server kích hoạt hook `onStoreDocument`.
   - Biên dịch toàn bộ trạng thái hiện tại thành 1 khối binary nén duy nhất qua `Y.encodeStateAsUpdate(ydoc)`.
   - Ghi một bản ghi Snapshot mới vào bảng `document_snapshots` (tăng `version = version + 1`, ghi dung lượng byte và thời gian tạo).
   - Tự động xóa sạch các bản ghi delta tạm trong `document_update_logs` để tối ưu dung lượng lưu trữ.

---

### Workflow 5: Quản trị hệ thống & Kiểm toán (Super Admin Governance & Audit)
1. **Truy cập chuyên biệt (`/admin`)**: Phân tách hoàn toàn khỏi Workspace người dùng, có giao diện bảo mật riêng `AdminLoginPage.tsx` và Layout Dashboard chuyên nghiệp.
2. **Quản trị Người dùng (`AdminUsersView`)**: Tìm kiếm, tạo tài khoản, đổi quyền (`USER` $\leftrightarrow$ `ADMIN`), reset mật khẩu, xóa tài khoản.
3. **Quản trị Tài liệu (`AdminDocumentsView`)**:
   - **Open & Edit in Workspace**: 1-click nhảy thẳng vào trình soạn thảo trực tiếp với quyền **Super Admin Override** (toàn quyền sửa bất kỳ tài liệu nào trên hệ thống).
   - **Quick Content Inspector & Editor (`AdminDocContentModal`)**: Xem/sửa trực tiếp nội dung văn bản text thuần ngay trong Admin, tự động tạo snapshot checkpoint `v+1`.
   - **History & Audit Logs Explorer (`AdminDocHistoryModal`)**:
     - *Tab 1: Snapshots Timeline*: Danh sách các phiên bản, kích thước, thời gian, nút xem trước văn bản (Preview), nút khôi phục (Restore).
     - *Tab 2: Incremental Logs*: Soi chi tiết các gói cập nhật delta chưa nén trong `document_update_logs` (Clock ID, Byte size).
     - *Tab 3: Access & Permissions*: Kiểm toán chủ sở hữu và danh sách thành viên được chia sẻ quyền.
4. **Cấu hình Runtime Flags (`AdminSettingsView`)**: Bật/tắt đăng ký, bật/tắt quyền khách vãng lai, chế độ bảo trì (Maintenance Mode), thời gian debounce compaction (mặc định 3000ms).

---

## 3. MA TRẬN XỬ LÝ 9 VẤN ĐỀ KỸ THUẬT LỚN (ISSUES & RESOLUTIONS MATRIX)

---

### Issue 1: Hai người cùng sửa / chèn vào cùng 1 ký tự / vị trí

- **Triệu chứng lỗi nếu dùng hệ thống cũ**: 
  - Ban đầu có chữ `"A"`. User 1 chèn `"B"` tại vị trí 1 $\rightarrow$ `"AB"`. User 2 chèn `"C"` tại vị trí 1 $\rightarrow$ `"AC"`.
  - Khi gửi vị trí số nguyên `index: 1`, User 1 nhận lệnh chèn `C` $\rightarrow$ ra `"ACB"`. User 2 nhận lệnh chèn `B` $\rightarrow$ ra `"ABC"`. $\implies$ **Hai máy bị lệch nội dung (Desynchronization)**.
- **Giải pháp trong SyncCraft (Thuật toán YATA)**:
  - Loại bỏ hoàn toàn vị trí số nguyên. Biểu diễn văn bản dưới dạng **Danh sách liên kết đôi (Doubly Linked List)** gồm các Node `Item`.
  - Mỗi ký tự mang ID bất biến: `(ClientID, LogicalClock)`.
  - Node `B` có `originLeft = ID(A)`, `originRight = null`.
  - Node `C` có `originLeft = ID(A)`, `originRight = null`.
  - Khi hòa giải, do có cùng `originLeft` và `originRight`, thuật toán thực hiện quy tắc toán học xác định duy nhất: **So sánh ClientID**:
    $$\text{Nếu } originLeft_B = originLeft_C \implies \text{Xếp vị trí theo } ClientID_1 < ClientID_2$$
  - Vì mọi máy tính đều thực thi cùng một quy tắc toán học, tất cả đều ra chung 1 kết quả `"ACB"` (hoặc `"ABC"`) mà không cần Server phân xử.

---

### Issue 2: Xử lý khi mất hoàn toàn Internet (Offline-First Resilience)

- **Triệu chứng lỗi nếu dùng hệ thống cũ**: 
  - Mất mạng $\rightarrow$ Người dùng gõ tiếp $\rightarrow$ Khi có mạng lại bị mất trắng chữ đã gõ hoặc đè mất chữ của người khác đang online.
- **Giải pháp trong SyncCraft**:
  1. **Lưu trữ cục bộ vĩnh viễn (`y-indexeddb`)**: Mỗi thao tác gõ khi offline được ghi ngay vào IndexedDB trên ổ cứng trình duyệt. Đóng tab mở lại văn bản vẫn nguyên vẹn 100%.
  2. **Giao thức State Vector 2 chiều khi Reconnect**:
     - Client A gửi State Vector: $SV_A = \{ A: 150, \ B: 80 \}$ (Client A đã có 150 thao tác của A, 80 của B).
     - Server gửi State Vector: $SV_{\text{Server}} = \{ A: 100, \ B: 95 \}$.
     - **Hai bên chỉ gửi đúng phần delta chênh lệch**: Client A gửi cho Server thao tác của $A$ từ $101 \rightarrow 150$. Server gửi cho Client A thao tác của $B$ từ $81 \rightarrow 95$.
     - Hai bên nạp delta $\rightarrow$ Văn bản hợp nhất hoàn hảo chỉ trong vài chục mili-giây.

---

### Issue 3: Xung đột Một người Xóa - Một người Sửa/Format (Delete vs Edit Race Condition)

- **Triệu chứng lỗi nếu dùng hệ thống cũ**: 
  - User 1 xóa ký tự `A`. User 2 (đang offline) bôi đậm (Bold) hoặc gõ chữ `X` ngay sau `A`. Khi kết nối lại, server báo lỗi `NullReferenceException` hoặc làm mất đoạn chữ của User 2 do node `A` không còn tồn tại.
- **Giải pháp trong SyncCraft (Cơ chế Tombstone)**:
  - Khi User 1 xóa `A`, node `ID(A)` **không bị hủy khỏi bộ nhớ**, mà chỉ được đánh dấu cờ **`deleted = true` (Tombstone)**.
  - Khi User 2 gửi lệnh chèn chữ `X` sau `A`, con trỏ `originLeft` của `X` vẫn trỏ tới `ID(A)`. Dù `A` đã bị ẩn trên màn hình, vị trí của `X` vẫn được định vị chính xác tuyệt đối trong chuỗi liên kết.
  - Khi toàn bộ các client đã nhận đủ thông tin xác nhận xóa, hệ thống mới tiến hành Garbage Collection (GC) để giải phóng RAM.

---

### Issue 4: Chống lặp gói tin và lệch thứ tự gói khi mạng chập chờn (Idempotency & Commutativity)

- **Triệu chứng lỗi nếu dùng hệ thống cũ**: 
  - Mạng lag khiến gói tin cập nhật bị gửi lại 3 lần $\rightarrow$ Ký tự bị nhân 3 thành `"AAA"`. Gói tin đến trước/sau bị đảo lộn $\rightarrow$ Lệch ngữ nghĩa.
- **Giải pháp trong SyncCraft**:
  - Toán tử hợp nhất của CRDT ($\sqcup$) tuân thủ tuyệt đối 3 định lý toán học:
    1. **Tính giao hoán (Commutative)**: $A \sqcup B = B \sqcup A$ (Gói tin đến trước hay đến sau không làm đổi kết quả).
    2. **Tính kết hợp (Associative)**: $(A \sqcup B) \sqcup C = A \sqcup (B \sqcup C)$ (Gom nhóm gói tin tùy ý).
    3. **Tính lũy đẳng (Idempotent)**: $A \sqcup A = A$ (Nhận lại cùng một gói tin 100 lần vẫn chỉ áp dụng đúng 1 lần).

---

### Issue 5: Xung đột Undo/Redo giữa nhiều người dùng (Multiplayer Undo Isolation)

- **Triệu chứng lỗi nếu dùng hệ thống cũ**: 
  - User A gõ chữ, User B gõ chữ tiếp theo. User A nhấn `Ctrl + Z` (Undo) $\rightarrow$ Vô tình xóa nhầm chữ của User B.
- **Giải pháp trong SyncCraft**:
  - Tắt hoàn toàn bộ Undo mặc định của ProseMirror: `StarterKit.configure({ history: false })`.
  - Sử dụng **`Y.UndoManager`**: UndoManager chỉ theo dõi phạm vi các `Item Node` có `ClientID === LocalClientID`.
  - Khi User A nhấn `Ctrl + Z`, hệ thống **chỉ hoàn tác đúng các ký tự do chính User A sinh ra**, hoàn toàn không đụng chạm đến văn bản mà User B đang gõ cùng lúc.

---

### Issue 6: Tối ưu hiệu năng Editor, triệt tiêu Lag gõ phím và Re-render thừa

- **Triệu chứng lỗi**: 
  - Khi tài liệu dài hàng chục ngàn từ, việc gõ phím khiến React re-render lại toàn bộ thanh Toolbar, Slash Menu và Header gây giật lag.
- **Giải pháp trong SyncCraft**:
  1. **Nạp Code Highlighting thông minh**: Dùng `lowlight(common)` chỉ nạp 37 ngôn ngữ phổ biến nhất (~25KB) thay vì nạp toàn bộ Highlight.js (hàng trăm KB).
  2. **Zero-Latency Dispatch**: Áp dụng transaction thẳng vào ProseMirror DOM local trong 0ms trước khi đẩy vào Yjs.
  3. **Awareness Throttling**: Tần số phát tín hiệu vị trí chuột được giới hạn 50ms, tránh gây nghẽn băng thông WebSocket.

---

### Issue 7: Nghẽn cổ chai Database I/O khi hàng ngàn người gõ phím cùng lúc

- **Triệu chứng lỗi**: 
  - Nếu mỗi phím gõ đều thực hiện câu lệnh SQL `UPDATE documents SET content = ...`, Database sẽ nhanh chóng cạn kiệt Connection Pool và sập hệ thống (Crash).
- **Giải pháp trong SyncCraft**:
  - **In-Memory Active Document**: Toàn bộ thao tác gõ phím được xử lý trong RAM của Hocuspocus Server.
  - **Debounced 3000ms Write-Behind Compaction**: Chỉ khi người dùng dừng gõ trong 3 giây, Server mới gom toàn bộ trạng thái thành 1 snapshot nhị phân nén và ghi xuống PostgreSQL 1 lần duy nhất. Giảm thiểu hơn 99% áp lực I/O đĩa cứng.

---

### Issue 8: Phân quyền Super Admin mở và sửa trực tiếp Document Private của người khác

- **Triệu chứng lỗi**: 
  - Khi Super Admin bấm vào một tài liệu riêng tư (Private) của người dùng khác từ Dashboard Quản trị, hệ thống báo lỗi `403 Forbidden` do Admin không có bản ghi trong bảng `document_permissions`.
- **Giải pháp trong SyncCraft (Super Admin Override)**:
  - Cập nhật cả 2 tầng bảo mật:
    1. **Tại tầng WebSocket (`auth.hook.ts`)**: Nếu `dbUser.systemRole === "ADMIN"`, tự động gán `userRole = "OWNER"` và `readOnly = false`.
    2. **Tại tầng REST API (`document.routes.ts`)**: Trong endpoint `GET /api/documents/:id` và `PATCH /api/documents/:id`, nếu `req.user.systemRole === "ADMIN"`, tự động cấp quyền truy cập và chỉnh sửa toàn bộ metadata.

---

### Issue 9: Hiện tượng DevTools Offline giữa 2 tab bị dính BroadcastChannel nội bộ

- **Triệu chứng khi kiểm thử**: 
  - Mở 2 Tab thường trên cùng trình duyệt Chrome $\rightarrow$ Chọn DevTools "Offline" trên Tab 1 $\rightarrow$ Gõ text trên Tab 1 thì Tab 2 vẫn lập tức nhận được chữ.
- **Nguyên nhân & Giải pháp**:
  - **Nguyên nhân**: Mặc định trình duyệt chia sẻ chung bộ nhớ IndexedDB và `BroadcastChannel` giữa các Tab cùng Origin `localhost:5173`. Tab 1 truyền thẳng sang Tab 2 qua RAM máy tính mà không đi qua Internet.
  - **Giải pháp xử lý**:
    1. Cấu hình `broadcast: false` trên `HocuspocusProvider` để ép 100% dữ liệu phải đi qua WebSocket Server.
    2. Bổ sung `window.addEventListener('offline')` và `window.addEventListener('online')` để ngắt/nối WebSocket tức thì theo trạng thái DevTools.
    3. Quy định chuẩn kiểm thử: Mở **1 Tab thường** và **1 Tab Ẩn danh (Incognito `Ctrl+Shift+N`)** để tách biệt hoàn toàn bộ nhớ cache.

---

## 4. BỘ KIỂM THỬ TỰ ĐỘNG HÓA (VITEST TEST SUITE - 23/23 TESTS)

Hệ thống được bảo vệ bởi **7 bộ test suite chuyên sâu** với **23 test cases vượt qua 100%**:

```
 RUN  v3.2.7 C:/laragon/www/collaborative/server

 ✓ tests/crdt.test.ts (4 tests) 
   - Kiểm thử tính giao hoán, kết hợp, bất biến lặp của thuật toán YATA
   - Kiểm thử giải quyết xung đột khi 2 người cùng chèn vào cùng vị trí index
 ✓ tests/offline-reconciliation.test.ts (3 tests)
   - Kiểm thử gõ offline rồi kết nối lại server
   - Kiểm thử sửa đổi đồng thời khi 1 người Offline và 1 người Online
   - Kiểm thử chống lặp gói tin (Idempotency) khi mạng chập chờn
 ✓ tests/auth.test.ts (2 tests)
   - Kiểm thử đăng ký, mã hóa mật khẩu bcrypt, và cấp phát JWT token
 ✓ tests/admin-and-oauth.test.ts (4 tests)
   - Kiểm thử đăng nhập OAuth Google/GitHub và phân quyền Super Admin
 ✓ tests/admin-crud.test.ts (2 tests)
   - Kiểm thử các API CRUD User, Document, và Feature Flags
 ✓ tests/admin-doc-audit.test.ts (2 tests)
   - Kiểm thử giải mã Yjs binary snapshot, xem log delta và khôi phục version
 ✓ tests/document-sharing-sync.test.ts (6 tests)
   - Kiểm thử chia sẻ quyền Viewer/Editor và bảo vệ tài liệu Private

 Test Files  7 passed (7)
      Tests  23 passed (23)
   Duration  872ms
```

---

> 🎯 **Tổng Kết**: SyncCraft là một hệ thống soạn thảo phân tán hoàn chỉnh, giải quyết triệt để các bài toán khó nhất về xung đột dữ liệu, đảm bảo độ trễ gõ phím **0ms**, hỗ trợ **Offline-First 100%**, và cung cấp năng lực quản trị, kiểm toán toàn diện cho Super Admin.
