# Hướng Dẫn Kỹ Thuật: Kiểm Thử Offline-First & Kiến Trúc Notion-Like Slash Editor

Tài liệu này giải thích chi tiết cách xử lý và kiểm thử kịch bản **Offline không có Internet**, cùng với kiến trúc tạo các **UI Component chuẩn Notion** (Slash Command Menu `/`, Floating Bubble Menu, Callout blocks, Tables, Task Checklists).

---

## 📑 Mục Lục
1. [Cơ Chế Xử Lý Khi Mất Internet (Offline-First Architecture)](#1-cơ-chế-xử-lý-khi-mất-internet-offline-first-architecture)
2. [Các Test Case Xử Lý Offline & Hòa Giải Dữ Liệu](#2-các-test-case-xử-lý-offline--hòa-giải-dữ-liệu)
3. [Hướng Dẫn Test Bằng Tay (Manual Browser Testing Với DevTools)](#3-hướng-dẫn-test-bằng-tay-manual-browser-testing-với-devtools)
4. [Kiến Trúc UI Component Chuẩn Notion (Slash Command Menu `/`)](#4-kiến-trúc-ui-component-chuẩn-notion-slash-command-menu-)
5. [Danh Sách Các Khối Block Kiểu Notion Đang Có](#5-danh-sách-các-khối-block-kiểu-notion-đang-có)

---

## 1. Cơ Chế Xử Lý Khi Mất Internet (Offline-First Architecture)

Trong các ứng dụng soạn thảo truyền thống, khi mất mạng, nếu người dùng tiếp tục gõ chữ thì khi có mạng lại sẽ xảy ra hiện tượng:
- Bị mất sạch chữ đã gõ khi offline.
- Hoặc đè mất chữ của người khác đang online (Last-Write-Wins xung đột).

Trong **SyncCraft**, chúng tôi giải quyết bài toán này qua **Bộ ba kết hợp**:
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

## 2. Các Test Case Xử Lý Offline & Hòa Giải Dữ Liệu

Đã được cài đặt và tự động hóa trong file test: [`server/tests/offline-reconciliation.test.ts`](file:///c:/laragon/www/collaborative/server/tests/offline-reconciliation.test.ts)

### 🧪 Test Case 1: Client gõ offline rồi kết nối lại server
- **Kịch bản**: 
  1. Client A tải tài liệu từ Server.
  2. Ngắt kết nối mạng của Client A.
  3. Client A gõ thêm 500 từ và checklist.
  4. Bật kết nối mạng trở lại.
- **Kỳ vọng (Expectation)**:
  - Client A gửi State Vector lên Server.
  - Server nhận delta và cập nhật vào `Y.Doc` trên server.
  - Nội dung của Client A và Server hội tụ 100% giống hệt nhau (`expect(clientText).toBe(serverText)`).

### 🧪 Test Case 2: Chỉnh sửa đồng thời (Concurrent Edits) khi 1 người Offline và 1 người Online
- **Kịch bản**:
  1. Ban đầu Doc có tiêu đề `"Header Line"`.
  2. Client A bị rớt mạng $\rightarrow$ Gõ thêm `"Client A offline note"` ở cuối trang.
  3. Client B vẫn có mạng $\rightarrow$ Gõ thêm `"Client B announcement"` ở đầu trang.
  4. Client A có mạng trở lại và reconnect.
- **Kỳ vọng (Expectation)**:
  - Cả 2 luồng chỉnh sửa tự động hòa giải.
  - Văn bản cuối cùng của cả Server, Client A và Client B đều chứa đầy đủ cả thông báo của B lẫn ghi chú offline của A mà không ai bị mất chữ.

### 🧪 Test Case 3: Chống lặp gói tin khi mạng chập chờn (Idempotency)
- **Kịch bản**: Mạng lag khiến gói tin cập nhật offline bị gửi lại 5 lần liên tiếp.
- **Kỳ vọng (Expectation)**: Phép toán `Y.applyUpdate()` đảm bảo $A \sqcup A = A$, văn bản không bị nhân đôi chữ.

---

## 3. Hướng Dẫn Test Bằng Tay (Manual Browser Testing Với DevTools)

Bạn có thể tự tay kiểm chứng tính năng Offline-First trên trình duyệt như sau:

```
+-----------------------------------------------------------------------------+
| BƯỚC 1: Mở ứng dụng tại http://localhost:5173                               |
| BƯỚC 2: Nhấn F12 (DevTools) -> Chuyển sang tab "Network"                    |
| BƯỚC 3: Tại mục Throttling (mặc định "No throttling"), chọn "Offline"       |
+-----------------------------------------------------------------------------+
                                       │
                                       ▼
+-----------------------------------------------------------------------------+
| BƯỚC 4: Gõ thêm 1 đoạn văn bản mới vào Editor                              |
|         -> Quan sát Badge ở Header chuyển sang "⚪ Offline Cache"            |
|         -> Đóng hoàn toàn tab trình duyệt và mở lại tab mới                 |
|         -> Văn bản vẫn hiển thị nguyên vẹn (nhờ y-indexeddb)                |
+-----------------------------------------------------------------------------+
                                       │
                                       ▼
+-----------------------------------------------------------------------------+
| BƯỚC 5: Trong tab Network của DevTools, chuyển lại "No throttling" (Online) |
|         -> Badge ở Header chuyển ngay sang "🟢 Saved to Cloud"              |
|         -> Mở 1 cửa sổ ẩn danh khác: đoạn văn bản gõ lúc offline lập tức    |
|            xuất hiện trên cửa sổ kia theo thời gian thực!                   |
+-----------------------------------------------------------------------------+
```

---

## 4. Kiến Trúc UI Component Chuẩn Notion (Slash Command Menu `/`)

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

### Các Tính Năng Đỉnh Cao Của Menu `/`:
1. **Phân nhóm chuyên nghiệp**: Phân tách rõ ràng thành *Basic Blocks*, *Lists & Tasks*, và *Advanced & Structure*.
2. **Tìm kiếm tức thì (Live Fuzzy Search)**: Gõ `/h1`, `/task`, `/code`, `/table`, `/note` $\rightarrow$ menu tự lọc kết quả trong 0ms.
3. **Phím tắt điều hướng bàn phím**:
   - `↑` / `↓`: Di chuyển chọn block.
   - `Enter`: Chèn block vào vị trí con trỏ và tự động xóa dấu `/` vừa gõ.
   - `Esc`: Đóng menu.
4. **Floating Bubble Menu**: Bôi đen bất kỳ đoạn văn bản nào để mở thanh công cụ nổi nhanh (Đổi màu highlight, bôi đậm, in nghiêng, gạch ngang, chèn link, code inline).
5. **Interactive Table Bar**: Khi bấm vào bảng, xuất hiện thanh công cụ nổi cho phép thêm/xóa hàng, thêm/xóa cột, và xóa bảng chỉ với 1 click.
