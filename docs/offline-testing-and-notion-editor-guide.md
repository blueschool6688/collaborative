# Hướng Dẫn Kỹ Thuật: Kiểm Thử Offline-First & Kiến Trúc Notion-Like Slash Editor

Tài liệu này giải thích chi tiết cách xử lý và kiểm thử kịch bản **Offline không có Internet**, cùng với kiến trúc tạo các **UI Component chuẩn Notion** (Slash Command Menu `/`, Floating Bubble Menu, Callout blocks, Tables, Task Checklists).

---

## 📑 Mục Lục
1. [Cơ Chế Xử Lý Khi Mất Internet (Offline-First Architecture)](#1-cơ-chế-xử-lý-khi-mất-internet-offline-first-architecture)
2. [Tại Sao Test DevTools Giữa 2 Tab Cần Lưu Ý?](#2-tại-sao-test-devtools-giữa-2-tab-cần-lưu-ý)
3. [Quy Trình Kiểm Thử 2 Client Offline Bằng DevTools](#3-quy-trình-kiểm-thử-2-client-offline-bằng-devtools)
4. [Các Test Case Tự Động Hóa (Vitest Suite)](#4-các-test-case-tự-động-hóa-vitest-suite)
5. [Kiến Trúc UI Component Chuẩn Notion (Slash Command Menu `/`)](#5-kiến-trúc-ui-component-chuẩn-notion-slash-command-menu-)

---

## 1. Cơ Chế Xử Lý Khi Mất Internet (Offline-First Architecture)

Trong các ứng dụng soạn thảo truyền thống, khi mất mạng, nếu người dùng tiếp tục gõ chữ thì khi có mạng lại sẽ xảy ra hiện tượng:
- Bị mất sạch chữ đã gõ khi offline.
- Hoặc đè mất chữ của người khác đang online (Last-Write-Wins xung đột).

Trong **SyncCraft**, bài toán này được giải quyết qua **Bộ ba kết hợp**:
1. **`y-indexeddb` (Local Browser Database)**:
   - Lưu toàn bộ cây dữ liệu CRDT `Y.Doc` vào cơ sở dữ liệu IndexedDB của trình duyệt.
   - Khi tắt tab hoặc mất mạng, dữ liệu vẫn được lưu vĩnh viễn trên ổ cứng máy client.
2. **Thuật toán YATA / CRDT**:
   - Khi gõ offline, mỗi ký tự được gắn `(ClientID, LogicalClock)`.
   - Các thao tác offline hoàn toàn độc lập, không cần chờ cấp phát ID từ server.
3. **State Vector Bi-Directional Exchange (Khi Reconnect)**:
   - Khi có mạng trở lại, Client và Server chỉ trao đổi tóm tắt **State Vector**.
   - Server gửi cho Client các đoạn Server có mà Client chưa có.
   - Client gửi cho Server các đoạn Client đã gõ lúc offline.
   - Cả 2 hòa giải (merge) tức thì mà không gây xung đột hay mất chữ.

---

## 2. Tại Sao Test DevTools Giữa 2 Tab Cần Lưu Ý?

Khi kiểm thử giả lập Offline bằng Chrome DevTools giữa 2 Tab trên cùng một máy, cần hiểu rõ 2 nguyên lý sau:

1. **Cơ Chế Local BroadcastChannel của Trình Duyệt**:
   - Nếu bạn mở 2 Tab thông thường trên **cùng một trình duyệt Chrome** (cùng một Origin `http://localhost:5173`), trình duyệt sẽ chia sẻ chung bộ nhớ **IndexedDB**.
   - Mặc định, các Tab cùng Origin có thể giao tiếp trực tiếp với nhau qua RAM bằng `BroadcastChannel`. Do đó, nếu Tab 1 bị giả lập Offline qua DevTools, Tab 2 vẫn có thể bắt được dữ liệu từ Tab 1 qua kênh nội bộ của trình duyệt chứ không phải qua mạng WebSocket!
   - 🛠️ **Cách khắc phục**: Client đã cấu hình `broadcast: false` trên Provider để ép toàn bộ luồng truyền tin phải đi qua WebSocket Server.
2. **Tách Biệt Session Giữa 2 Client**:
   - Để kiểm thử chính xác 100% kịch bản mạng phân tán thực tế, **Client 1** và **Client 2** cần nằm ở 2 môi trường lưu trữ độc lập:
     - **Tab 1**: Mở ở **Cửa sổ Chrome bình thường**.
     - **Tab 2**: Mở ở **Cửa sổ Ẩn danh (Incognito `Ctrl + Shift + N`)** hoặc một trình duyệt khác (như Edge/Firefox).

---

## 3. Quy Trình Kiểm Thử 2 Client Offline Bằng DevTools

Dưới đây là 5 bước chuẩn xác nhất để kiểm chứng:

```
+---------------------------------------------------------------------------------------+
| BƯỚC 1: Mở Tab 1 (Chrome Thường) và Tab 2 (Ẩn Danh Incognito) cùng vào 1 Document     |
|         -> Cả 2 tab đều hiển thị "🟢 Saved" trên Header.                              |
+---------------------------------------------------------------------------------------+
                                           │
                                           ▼
+---------------------------------------------------------------------------------------+
| BƯỚC 2: Trên Tab 1, nhấn F12 (DevTools) -> Chuyển sang tab "Network"                  |
|         -> Tại mục Throttling (mặc định "No throttling"), chọn "Offline".             |
|         -> Quan sát Badge trên Header Tab 1 chuyển sang "⚪ Offline".                 |
+---------------------------------------------------------------------------------------+
                                           │
                                           ▼
+---------------------------------------------------------------------------------------+
| BƯỚC 3: Trên Tab 1 (đang Offline): Gõ thêm 1 dòng text:                               |
|         "==> Dòng này được Tab 1 gõ khi hoàn toàn mất mạng <=="                       |
|         -> Tab 2 (đang Online) KHÔNG nhìn thấy dòng này (do Tab 1 đang ngắt kết nối).|
+---------------------------------------------------------------------------------------+
                                           │
                                           ▼
+---------------------------------------------------------------------------------------+
| BƯỚC 4: Trên Tab 2 (đang Online): Gõ thêm 1 dòng text khác:                          |
|         "==> Dòng này do Tab 2 gõ độc lập cùng thời điểm <=="                         |
+---------------------------------------------------------------------------------------+
                                           │
                                           ▼
+---------------------------------------------------------------------------------------+
| BƯỚC 5: Trên Tab 1, tại tab Network của DevTools: Chọn lại "No throttling" (Online)   |
|         -> Tab 1 lập tức Reconnect lại Server WebSocket.                              |
|         -> CẢ 2 TAB TỰ ĐỘNG HÒA GIẢI: Xuất hiện đầy đủ cả 2 dòng văn bản của          |
|            Tab 1 và Tab 2 mà không ai bị đè hay mất chữ!                              |
+---------------------------------------------------------------------------------------+
```

---

## 4. Các Test Case Tự Động Hóa (Vitest Suite)

Các kịch bản trên đã được tự động hóa và vượt qua 100% trong file test: [`server/tests/offline-reconciliation.test.ts`](file:///c:/laragon/www/collaborative/server/tests/offline-reconciliation.test.ts)

- **Test 1**: Client A gõ offline $\rightarrow$ Reconnect $\rightarrow$ Server nhận và cập nhật đầy đủ.
- **Test 2**: Client A (offline) và Client B (online) gõ đồng thời $\rightarrow$ Hòa giải State Vector hai chiều thành công không xung đột.
- **Test 3**: Gói tin cập nhật offline gửi lặp lại nhiều lần $\rightarrow$ Tính chất giao hoán và lũy đẳng (Idempotence) ngăn chặn trùng lặp văn bản.

---

## 5. Kiến Trúc UI Component Chuẩn Notion (Slash Command Menu `/`)

Menu lệnh gõ `/` được xây dựng bằng component [`client/src/components/editor/SlashCommandMenu.tsx`](file:///c:/laragon/www/collaborative/client/src/components/editor/SlashCommandMenu.tsx):

```
+-----------------------------------------------------------------------+
|  [🔍 Filter blocks (e.g. h1, list, code, table, note)...]       [ESC] |
+-----------------------------------------------------------------------+
|  BASIC BLOCKS                                                         |
|  [T]  Text              Just start writing plain text.            [p] |
|  [H1] Heading 1         Big section heading.                      [#] |
|  [H2] Heading 2         Medium section heading.                  [##] |
|  [H3] Heading 3         Small section sub-heading.              [###] |
|  [-]  Divider           Visually divide blocks with rule.       [---] |
+-----------------------------------------------------------------------+
|  LISTS & TASKS                                                        |
|  [•]  Bullet List       Create a simple bulleted list.            [-] |
|  [1.] Numbered List     Create a list with sequential numbering. [1.] |
|  [☑]  Task Checklist    Track tasks with interactive checkboxes. [[]] |
+-----------------------------------------------------------------------+
|  ADVANCED & STRUCTURE                                                 |
|  [<>] Code Snippet      Capture code with syntax highlighting.  [```] |
|  [⊞]  Table             Insert a 3x3 editable table.          [table] |
|  [💡] Callout Box       Highlight context with an emoji box.   [note] |
|  [❝]  Quote             Capture a quotation or citation.          [>] |
|  [🖍] Highlight Text    Mark key terms with electric highlight [mark] |
|  [`]  Inline Code       Format short inline variable.             [`] |
+-----------------------------------------------------------------------+
```
