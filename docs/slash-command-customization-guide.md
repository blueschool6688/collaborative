# ⚡ Hướng Dẫn Tùy Chỉnh Lệnh Slash Command (`/`) Trong Editor

Tài liệu này hướng dẫn chi tiết **cách thức hoạt động** và **cách thêm / sửa / xóa các khối lệnh Slash Command (`/`)** trong trình soạn thảo TipTap của SyncCraft.

---

## 📑 Mục Lục
1. [Cơ Chế Hoạt Động Của Slash Command](#1-cơ-chế-hoạt-động-của-slash-command)
2. [Vị Trí File Mã Nguồn](#2-vị-trí-file-mã-nguồn)
3. [Cách Thêm Một Lệnh Command Mới](#3-cách-thêm-một-lệnh-command-mới)
4. [Cách Chỉnh Sửa Hoặc Xóa Lệnh Hiện Có](#4-cách-chỉnh-sửa-hoặc-xóa-lệnh-hiện-có)
5. [Bảng Danh Sách Các Lệnh Đang Có Sẵn](#5-bảng-danh-sách-các-lệnh-đang-có-sẵn)

---

## 1. Cơ Chế Hoạt Động Của Slash Command

Hệ thống Slash Command gồm 2 phần kết hợp:

1. **Bắt sự kiện gõ phím `/` trong `CollaborativeEditor.tsx`**:
   - Khi người dùng gõ ký tự `/`, hàm `handleKeyDown` đo tọa độ con trỏ chuột (`coordsAtPos(from)`) và mở Popup Menu nổi tại đúng vị trí con trỏ.
2. **Menu chọn khối và thực thi lệnh trong `SlashCommandMenu.tsx`**:
   - Khi người dùng chọn một khối (bằng phím `Enter` hoặc click chuột), hàm `executeCommand` sẽ:
     1. Xóa ký tự `/` đã gõ trước đó qua `editor.commands.deleteRange(...)`.
     2. Gọi phương thức TipTap Chain tương ứng (ví dụ `.toggleHeading({ level: 1 })`, `.toggleTaskList()`, `.insertTable()`).
     3. Đóng Menu.

---

## 2. Vị Trí File Mã Nguồn

| Thành Phần | Đường Dẫn File | Trách Nhiệm |
| :--- | :--- | :--- |
| **Menu Giao Diện & Danh Sách Lệnh** | [`client/src/components/editor/SlashCommandMenu.tsx`](file:///c:/laragon/www/collaborative/client/src/components/editor/SlashCommandMenu.tsx) | Chứa mảng `commands: CommandItem[]`, bộ lọc tìm kiếm, phím tắt mũi tên `↑` `↓` `Enter` `Esc`. |
| **Trigger Khởi Tạo** | [`client/src/components/editor/CollaborativeEditor.tsx`](file:///c:/laragon/www/collaborative/client/src/components/editor/CollaborativeEditor.tsx) | Bắt phím `/` và tính toán tọa độ `top`/`left`. |

---

## 3. Cách Thêm Một Lệnh Command Mới

Mở file [`client/src/components/editor/SlashCommandMenu.tsx`](file:///c:/laragon/www/collaborative/client/src/components/editor/SlashCommandMenu.tsx) và thêm một phần tử vào mảng `const commands: CommandItem[] = [...]`:

### Ví Dụ 1: Thêm Khối "Code Block Python"
```typescript
{
  title: "Python Snippet",
  category: "Advanced & Structure",
  description: "Insert a Python code block with syntax highlighting.",
  shortcut: "py",
  icon: <CodeBlock size={18} className="text-emerald-400" />,
  action: (ed) => {
    ed.chain()
      .focus()
      .toggleCodeBlock({ language: "python" })
      .insertContent("# Write Python code here\ndef main():\n    print('Hello World')")
      .run();
  },
},
```

### Ví Dụ 2: Thêm Khối "Spoiler / Collapsible Box"
```typescript
{
  title: "Spoiler Alert",
  category: "Callouts & Embeds",
  description: "Insert a hidden spoiler warning block.",
  shortcut: "spoiler",
  icon: <WarningOctagon size={18} className="text-purple-400" />,
  action: (ed) => {
    ed.chain()
      .focus()
      .toggleBlockquote()
      .insertContent("🤫 **Spoiler Warning:** ")
      .run();
  },
},
```

### Cấu Trúc Khai Báo Một `CommandItem`:
```typescript
interface CommandItem {
  title: string;        // Tên hiển thị trong menu (ví dụ: "Heading 1")
  category: string;     // Nhóm (Basic Blocks / Lists & Tasks / Advanced & Structure / Callouts & Embeds)
  description: string;  // Mô tả ngắn bên dưới tên
  shortcut?: string;    // Phím tắt / từ khóa gợi ý (ví dụ: "#", "h1", "table")
  icon: React.ReactNode;// Biểu tượng icon từ Phosphor Icons
  action: (editor: Editor) => void; // Hàm TipTap Chain thực thi khi chọn
}
```

---

## 4. Cách Chỉnh Sửa Hoặc Xóa Lệnh Hiện Có

1. **Đổi kích thước bảng mặc định**:
   - Tìm lệnh `Table` trong `SlashCommandMenu.tsx`:
   - Đổi từ `insertTable({ rows: 3, cols: 3 })` thành `insertTable({ rows: 5, cols: 4 })`.
2. **Đổi màu highlight mặc định**:
   - Tìm lệnh `Highlight Text`:
   - Đổi `{ color: "#fef08a" }` (vàng) sang `{ color: "#a7f3d0" }` (xanh ngọc) hoặc `{ color: "#fbcfe8" }` (hồng).
3. **Xóa một lệnh không muốn dùng**:
   - Chỉ cần xóa bỏ đối tượng tương ứng khỏi mảng `commands`.

---

## 5. Bảng Danh Sách Các Lệnh Đang Có Sẵn

| Nhóm Phân Loại | Tên Lệnh (Title) | Từ Khóa Lọc (Shortcut) | Hành Động TipTap |
| :--- | :--- | :--- | :--- |
| **Basic Blocks** | Text | `p` | `setParagraph()` |
| | Heading 1 | `#` / `h1` | `toggleHeading({ level: 1 })` |
| | Heading 2 | `##` / `h2` | `toggleHeading({ level: 2 })` |
| | Heading 3 | `###` / `h3` | `toggleHeading({ level: 3 })` |
| | Divider | `---` / `line` | `setHorizontalRule()` |
| **Lists & Tasks** | Bullet List | `-` / `ul` | `toggleBulletList()` |
| | Numbered List | `1.` / `ol` | `toggleOrderedList()` |
| | Task Checklist | `[]` / `task` | `toggleTaskList()` |
| **Advanced & Structure** | Code Snippet | ```` / `code` | `toggleCodeBlock()` |
| | Table | `table` | `insertTable({ rows: 3, cols: 3, withHeaderRow: true })` |
| | Quote | `>` / `quote` | `toggleBlockquote()` |
| | Inline Code | `` ` `` / `inline` | `toggleCode()` |
| | Highlight Text | `mark` / `hl` | `toggleHighlight({ color: "#fef08a" })` |
| | Math / LaTeX | `math` / `latex` | `insertContent("$$ ... $$")` |
| **Callouts & Embeds** | Info Callout Box | `note` / `info` | Blockquote với `💡 Note:` |
| | Warning Callout Box | `warn` / `alert` | Blockquote với `⚠️ Warning:` |
| | Success Tip Box | `tip` / `good` | Blockquote với `✅ Tip:` |
| | Image Link | `img` / `image` | Embed ảnh qua URL |
