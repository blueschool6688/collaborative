# Giải Thích Chi Tiết: Distributed Systems, CRDT (Yjs) & Thư Viện Hocuspocus Server

Tài liệu này giải thích chi tiết và trực quan về cách hệ thống phân tán (Distributed System) của **SyncCraft** vận hành, bản chất toán học của **CRDT (Yjs)**, và so sánh chuyên sâu giữa **Hocuspocus** với các thư viện **WebSocket truyền thống** (`ws`, `socket.io`).

---

## 📑 Mục Lục
1. [Bản Chất Vấn Đề: Tại Sao Không Dùng Mô Hình Client-Server Truyền Thống?](#1-bản-chất-vấn-đề-tại-sao-không-dùng-mô-hình-client-server-truyền-thống)
2. [Hocuspocus Là Gì? So Sánh Hocuspocus vs Raw WebSocket](#2-hocuspocus-là-gì-so-sánh-hocuspocus-vs-raw-websocket)
3. [Luồng Hoạt Động Chi Tiết (End-to-End Workflow)](#3-luồng-hoạt-động-chi-tiết-end-to-end-workflow)
4. [Cách Thức Vận Hành Của Hệ Thống Phân Tán (Distributed System Core)](#4-cách-thức-vận-hành-của-hệ-thống-phân-tán-distributed-system-core)
5. [Các Kịch Bản Thực Tế (Scenarios Walkthrough)](#5-các-kịch-bản-thực-tế-scenarios-walkthrough)

---

## 1. Bản Chất Vấn Đề: Tại Sao Không Dùng Mô Hình Client-Server Truyền Thống?

### ❌ Mô hình truyền thống (HTTP / WebSocket + Database thông thường):
- Khi User A gõ chữ `"Hello"`, client gửi chuỗi `"Hello"` hoặc gửi tọa độ `{ pos: 5, insert: "A" }` lên Server.
- Server ghi vào Database rồi broadcast tọa độ đó cho User B.
- **Vấn đề chí mạng (Race Condition & Latency)**:
  - Nếu User A và User B cùng gõ tại vị trí `pos: 5` tại cùng một thời điểm:
    - User A chèn chữ `"X"` $\rightarrow$ vị trí sau đó bị đẩy lùi 1 ký tự.
    - User B chèn chữ `"Y"` $\rightarrow$ vị trí của B bị lệch so với A.
  - Kết quả: Văn bản của User A hiển thị `"XY"`, nhưng của User B hiển thị `"YX"`, hoặc tệ hơn là nuốt mất chữ của nhau (**Desynchronization**).
  - Khi mất mạng (Offline), mô hình này hoàn toàn bất lực vì client không thể biết server sẽ cấp thứ tự nào.

### ✅ Giải pháp: CRDT (Conflict-free Replicated Data Type)
- **CRDT** biến mỗi trình duyệt (Browser Client) thành một **Nút Phân Tán Độc Lập (Autonomous Distributed Replica)**.
- Khi người dùng gõ phím:
  1. Ký tự được áp dụng vào cấu trúc dữ liệu cục bộ **ngay lập tức trong 0ms** (Optimistic UI).
  2. Ký tự được gắn một định danh bất biến: `(ClientID, LogicalClock)`.
  3. Khi các client gửi các gói nhị phân (Binary Diffs) cho nhau, các phép toán thỏa mãn 3 tính chất toán học:
     - **Giao hoán (Commutative)**: $A \sqcup B = B \sqcup A$ (Nhận trước hay nhận sau không quan trọng).
     - **Kết hợp (Associative)**: $(A \sqcup B) \sqcup C = A \sqcup (B \sqcup C)$ (Gom nhóm các gói tin không đổi kết quả).
     - **Bất biến lặp (Idempotent)**: $A \sqcup A = A$ (Gửi trùng gói tin khi lag mạng không làm nhân đôi chữ).
- **Kết quả**: Tất cả các client tự động hội tụ về đúng 1 nội dung duy nhất mà **không cần server trung tâm đứng ra phân xử hay khóa (lock)**.

---

## 2. Hocuspocus Là Gì? So Sánh Hocuspocus vs Raw WebSocket

### 2.1 Hocuspocus là gì?
**Hocuspocus** là một **Backend Sync Server Framework chuyên dụng cho Yjs/CRDT**, được phát triển bởi đội ngũ **TipTap**. 

Nó đóng vai trò là chiếc cầu nối hoàn chỉnh giữa:
- **Client Y.Doc** (dữ liệu CRDT trên trình duyệt).
- **Database vĩnh viễn** (PostgreSQL / MySQL / SQLite / S3).
- **Cluster phân tán** (Redis Pub/Sub).

```
                      +------------------------------------------+
                      |         HOCUSPOCUS SYNC SERVER           |
                      |                                          |
                      |  [WebSocket Transport Engine]            |
                      |              │                           |
                      |  [Room Manager & In-Memory Y.Doc]        |
                      |              │                           |
                      |  [onAuthenticate Hook]                   |
                      |  - JWT Validation                        |
                      |  - Permission Check (ReadOnly flag)      |
                      |              │                           |
                      |  [onLoadDocument Hook]                   |
                      |  - Read Compacted Snapshot from DB       |
                      |              │                           |
                      |  [onStoreDocument Hook]                  |
                      |  - 3s Debounced Compaction Snapshot      |
                      |              │                           |
                      |  [Redis Pub/Sub Extension]               |
                      |  - Multi-instance cross-server sync      |
                      |              │                           |
                      |  [Awareness Distributor]                 |
                      |  - Ephemeral Live Cursors & Presence     |
                      +------------------------------------------+
```

---

### 2.2 Bảng So Sánh Chi Tiết: Raw WebSocket (`ws` / `Socket.io`) vs Hocuspocus

| Tiêu chí | Raw WebSocket (`ws` / `Socket.io`) | Hocuspocus Server Framework |
| :--- | :--- | :--- |
| **Giao thức đồng bộ** | Bạn phải tự thiết kế schema JSON (`{ type: "edit", ... }`) và tự xử lý xung đột thứ tự. | Tích hợp sẵn giao thức binary của **Yjs Sync Protocol v2** và **State Vector Diffing**. |
| **Quản lý Room / Document** | Phải tự viết logic quản lý danh sách phòng, join/leave, lưu `Set<WebSocket>` thủ công. | Tự động mở Room theo `documentName`, tự hủy Room khỏi RAM khi không còn client nào kết nối. |
| **Xác thực & Phân quyền** | Phải tự parse header, query, viết middleware WebSocket handshake phức tạp. | Cung cấp hook `onAuthenticate`: cấp quyền đọc (`readOnly = true`) hoặc đọc-ghi dễ dàng. |
| **Lưu trữ Database (Persistence)** | Rất khó: Nếu lưu sau mỗi phím gõ sẽ làm sập Database; nếu lưu định kỳ thì dễ mất dữ liệu khi crash. | Tích hợp hook `onLoadDocument` và `onStoreDocument` với cơ chế **Debounced Compaction** tự động. |
| **Mở rộng Scale Ngang (Cluster)** | Phải tự viết adapter Redis Pub/Sub, tự serialize/deserialize state Yjs giữa các instance. | Tích hợp sẵn `@hocuspocus/extension-redis`, chỉ cần khai báo host/port Redis là các server node tự sync. |
| **Quản lý Con trỏ (Presence/Awareness)** | Phải tự định nghĩa message chuột, tự broadcast, tự xử lý timeout dọn dẹp khi user đóng tab. | Tích hợp sẵn **Yjs Awareness Protocol**, tự động đồng bộ con trỏ nhiều màu và xóa khi ngắt kết nối. |
| **Bảo vệ Bộ Nhớ (Memory GC)** | Nếu không cẩn thận sẽ bị Memory Leak khi giữ connection rác. | Tự động Garbage Collection (GC) các binary node và Room rỗng. |
| **Thời gian triển khai (Dev Time)** | Mất **3 đến 6 tuần** viết code boilerplate dễ phát sinh bug desync. | Triển khai xong trong **1 đến 2 ngày**, độ ổn định chuẩn Enterprise. |

---

## 3. Luồng Hoạt Động Chi Tiết (End-to-End Workflow)

Hãy theo dõi hành trình của một ký tự từ lúc người dùng gõ phím cho đến khi lưu trữ vĩnh viễn vào PostgreSQL:

```
[1. User nhấn phím "A"]
        │
        ▼
[2. TipTap ProseMirror Transaction]
        │
        ▼ (Biến đổi thành Yjs Transaction)
[3. Local Y.Doc (CRDT)] ──► Áp dụng ngay trên màn hình (0ms Latency - Optimistic)
        │
        ├──► [4a. Ghi ngay vào Browser IndexedDB] (Bảo đảm an toàn kể cả khi tắt tab)
        │
        └──► [4b. Sinh ra Binary Delta (Uint8Array)]
                    │
                    ▼ (Gửi qua WebSocket: ws://localhost:4000)
             [5. Hocuspocus Server]
                    │
                    ├──► [6. onAuthenticate Check] (Xác thực JWT & kiểm tra role)
                    │
                    ├──► [7. Merge vào In-Memory Y.Doc của Room]
                    │
                    ├──► [8. Broadcast Binary Delta cho các Client khác trong Room]
                    │           │
                    │           ▼ (Client khác nhận được)
                    │        [Client B Y.Doc] ──► TipTap render ký tự "A" của Alice
                    │
                    ├──► [9. Publish lên Redis Pub/Sub] (Nếu có nhiều server node)
                    │
                    └──► [10. Kích hoạt Debounce Timer 3 giây]
                                │ (Sau 3s không còn ai gõ tiếp)
                                ▼
                         [11. Y.encodeStateAsUpdate(ydoc)]
                                │
                                ├──► Lưu bản Snapshot nén vào PostgreSQL (`document_snapshots`)
                                └──► Dọn dẹp các update log cũ (`document_update_logs`)
```

---

## 4. Cách Thức Vận Hành Của Hệ Thống Phân Tán (Distributed System Core)

### 4.1 Cấu Trúc Định Danh Phân Tán (Lamport Timestamps & YATA)
Trong Yjs, mỗi ký tự không lưu theo số thứ tự mảng (`index: 0, 1, 2`) mà lưu dưới dạng một **Node trong Danh Sách Liên Kết Đôi (Doubly Linked List)**:

```
+------------------------------------+       +------------------------------------+
| ID: (Client_Alice, Clock: 101)     | ----> | ID: (Client_Bob, Clock: 54)        |
| Content: "Hello "                  | <---- | Content: "World"                   |
| Left: Origin_Node                  |       | Left: (Client_Alice, Clock: 101)   |
| Right: (Client_Bob, Clock: 54)     |       | Right: End_Node                    |
+------------------------------------+       +------------------------------------+
```

- Khi Alice và Bob cùng chèn chữ vào giữa `"Hello "` và `"World"`:
  - Cả hai node mới đều có `Left = (Alice, 101)` và `Right = (Bob, 54)`.
  - Quy tắc phân xử (**Tie-Breaking Rule**) của thuật toán YATA: So sánh `ClientID` (Ví dụ `ClientID_Alice > ClientID_Bob`) để xếp node của Alice đứng trước.
  - **Mọi máy tính trên toàn cầu đều thực hiện đúng quy tắc so sánh này mà không cần nói chuyện với nhau**, đảm bảo kết quả 100% giống nhau.

---

### 4.2 State Vector: Bí Quyết Tiết Kiệm 95% Băng Thông

Khi một client bị rớt mạng 10 phút rồi kết nối lại:
- **Cách thô sơ**: Tải lại toàn bộ văn bản 50MB $\rightarrow$ Tốn băng thông, lag mạng.
- **Cách của Yjs (State Vector)**:
  1. Client gửi 1 chuỗi byte nhỏ xíu (State Vector) đại diện cho những gì nó đã biết:
     $$\text{StateVector}_{\text{Client}} = \{ \text{Alice}: 500, \text{Bob}: 320 \}$$
  2. Server so sánh với State Vector hiện tại của Server:
     $$\text{StateVector}_{\text{Server}} = \{ \text{Alice}: 500, \text{Bob}: 380, \text{Charlie}: 120 \}$$
  3. Server thấy rằng Client chỉ thiếu:
     - Các thao tác của Bob từ clock `321` đến `380`.
     - Toàn bộ thao tác của Charlie từ clock `1` đến `120`.
  4. Server chỉ đóng gói phần nhị phân (Binary Delta) của phần thiếu đó (chỉ vài KB) gửi về cho Client.
  5. Quá trình hoàn tất trong **vài mili-giây**!

---

### 4.3 Phân Tách Hai Mặt Phẳng (Data Plane vs Control Plane)

Một trong những tối ưu kiến trúc quan trọng nhất của SyncCraft:

| Mặt Phẳng | Thành Phần | Bản Chất | Cách Xử Lý |
| :--- | :--- | :--- | :--- |
| **Data Plane** | Chữ viết, bảng biểu, danh sách việc cần làm | Dữ liệu vĩnh viễn (Durability) | Đi qua CRDT Y.Doc, lưu IndexedDB, nén Debounced Compaction 3s ghi vào PostgreSQL. |
| **Control Plane** | Tọa độ con trỏ chuột, bôi đen, avatar | Dữ liệu tạm thời (Ephemeral) | Đi qua Yjs Awareness Protocol, chỉ lưu trên RAM WebSocket, biến mất ngay khi tắt tab, **tuyệt đối không ghi vào Database**. |

---

## 5. Các Kịch Bản Thực Tế (Scenarios Walkthrough)

### 🔹 Kịch Bản 1: Alice và Bob cùng gõ phím tại cùng một vị trí
1. Alice gõ chữ `"X"`, Bob gõ chữ `"Y"`.
2. Màn hình Alice lập tức hiện `"X"`, màn hình Bob lập tức hiện `"Y"` (không có độ trễ).
3. Gói nhị phân của Alice bay qua server tới Bob $\rightarrow$ Yjs chèn `"X"`.
4. Gói nhị phân của Bob bay qua server tới Alice $\rightarrow$ Yjs chèn `"Y"`.
5. Thuật toán YATA tie-break: Cả hai màn hình đều hiển thị `"XY"` chuẩn xác 100%.

### 🔹 Kịch Bản 2: Alice mất kết nối (Offline Mode)
1. Alice đang ngồi trên máy bay không có Wi-Fi.
2. Alice vẫn mở editor gõ thêm 1,000 từ $\rightarrow$ `y-indexeddb` lưu toàn bộ vào ổ cứng cục bộ.
3. Khi máy bay hạ cánh, có mạng trở lại:
   - WebSocket tự động reconnect.
   - Hocuspocus trao đổi State Vector với Alice.
   - 1,000 từ của Alice được merge êm đẹp vào tài liệu trên server mà không đè mất những đoạn Bob đã sửa trong lúc Alice offline.

### 🔹 Kịch Bản 3: Scale nhiều Server Instance qua Redis Pub/Sub
1. **Server 1** đặt tại Hà Nội (Alice kết nối).
2. **Server 2** đặt tại TP.HCM (Bob kết nối).
3. Khi Alice gõ phím $\rightarrow$ Server 1 nhận được $\rightarrow$ Đẩy binary packet lên kênh Redis `hocuspocus:document:<id>`.
4. Server 2 đang subscribe kênh Redis này $\rightarrow$ Nhận được gói tin $\rightarrow$ Bắn qua WebSocket xuống màn hình của Bob.
5. Độ trễ toàn trình giữa 2 miền Nam-Bắc chỉ mất **< 20ms**.

### 🔹 Kịch Bản 4: Cơ chế Compaction Snapshot bảo vệ PostgreSQL
1. Trong 1 buổi họp, 5 người cùng gõ liên tục tạo ra 10,000 thao tác phím (keystrokes).
2. Nếu lưu từng phím $\rightarrow$ Database bị bắn 10,000 câu lệnh `INSERT` $\rightarrow$ Nghẽn kết nối DB.
3. Với SyncCraft:
   - Toàn bộ 10,000 thao tác được Hocuspocus xử lý trên RAM.
   - Khi buổi họp kết thúc (sau 3s không ai gõ nữa), Hocuspocus gọi `Y.encodeStateAsUpdate()` nén toàn bộ thành **1 bản ghi snapshot duy nhất** nặng vài chục KB ghi xuống PostgreSQL.
   - Database hoạt động nhẹ nhàng, bền bỉ và ổn định.

---

## 🎯 Tóm Lược

- **CRDT (Yjs)**: Giải quyết bài toán **hội tụ dữ liệu không xung đột (Conflict-Free Convergence)** trên mô hình phân tán không cần server trung tâm khóa dòng.
- **Hocuspocus**: Đóng vai trò là **hệ điều hành WebSocket thông minh** kết nối CRDT với Auth (JWT), Persistence (PostgreSQL Debounced Compaction), và Scale-Out (Redis Pub/Sub).
- **TipTap v2 + React 19**: Đóng vai trò là **lớp giao diện người dùng đỉnh cao**, mang lại trải nghiệm mượt mà, trực quan chuẩn Notion/Linear.
