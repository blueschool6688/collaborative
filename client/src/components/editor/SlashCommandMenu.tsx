import React, { useState, useEffect, useRef } from "react";
import { Editor } from "@tiptap/react";
import {
  TextT,
  TextHOne,
  TextHTwo,
  TextHThree,
  ListBullets,
  ListNumbers,
  CheckSquare,
  CodeBlock,
  Table,
  Quotes,
  Minus,
  LightbulbFilament,
  Highlighter,
  Code,
} from "@phosphor-icons/react";

interface SlashCommandMenuProps {
  editor: Editor | null;
  isOpen: boolean;
  onClose: () => void;
  position: { top: number; left: number };
}

interface CommandItem {
  title: string;
  category: "Basic Blocks" | "Lists & Tasks" | "Advanced & Structure";
  description: string;
  shortcut?: string;
  icon: React.ReactNode;
  action: (editor: Editor) => void;
}

export const SlashCommandMenu: React.FC<SlashCommandMenuProps> = ({
  editor,
  isOpen,
  onClose,
  position,
}) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [query, setQuery] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);

  const commands: CommandItem[] = [
    // Basic Blocks
    {
      title: "Text",
      category: "Basic Blocks",
      description: "Just start writing plain text.",
      shortcut: "p",
      icon: <TextT size={18} />,
      action: (ed) => ed.chain().focus().setParagraph().run(),
    },
    {
      title: "Heading 1",
      category: "Basic Blocks",
      description: "Big section heading.",
      shortcut: "#",
      icon: <TextHOne size={18} weight="bold" />,
      action: (ed) => ed.chain().focus().toggleHeading({ level: 1 }).run(),
    },
    {
      title: "Heading 2",
      category: "Basic Blocks",
      description: "Medium section heading.",
      shortcut: "##",
      icon: <TextHTwo size={18} weight="bold" />,
      action: (ed) => ed.chain().focus().toggleHeading({ level: 2 }).run(),
    },
    {
      title: "Heading 3",
      category: "Basic Blocks",
      description: "Small section sub-heading.",
      shortcut: "###",
      icon: <TextHThree size={18} weight="bold" />,
      action: (ed) => ed.chain().focus().toggleHeading({ level: 3 }).run(),
    },
    {
      title: "Divider",
      category: "Basic Blocks",
      description: "Visually divide blocks with a thin separator rule.",
      shortcut: "---",
      icon: <Minus size={18} />,
      action: (ed) => ed.chain().focus().setHorizontalRule().run(),
    },

    // Lists & Tasks
    {
      title: "Bullet List",
      category: "Lists & Tasks",
      description: "Create a simple bulleted list.",
      shortcut: "-",
      icon: <ListBullets size={18} />,
      action: (ed) => ed.chain().focus().toggleBulletList().run(),
    },
    {
      title: "Numbered List",
      category: "Lists & Tasks",
      description: "Create a list with sequential numbering.",
      shortcut: "1.",
      icon: <ListNumbers size={18} />,
      action: (ed) => ed.chain().focus().toggleOrderedList().run(),
    },
    {
      title: "Task Checklist",
      category: "Lists & Tasks",
      description: "Track tasks with interactive checkboxes.",
      shortcut: "[]",
      icon: <CheckSquare size={18} />,
      action: (ed) => ed.chain().focus().toggleTaskList().run(),
    },

    // Advanced & Structure
    {
      title: "Code Snippet",
      category: "Advanced & Structure",
      description: "Capture code with syntax highlighting.",
      shortcut: "```",
      icon: <CodeBlock size={18} />,
      action: (ed) => ed.chain().focus().toggleCodeBlock().run(),
    },
    {
      title: "Table",
      category: "Advanced & Structure",
      description: "Insert a 3x3 editable table with headers.",
      shortcut: "table",
      icon: <Table size={18} />,
      action: (ed) =>
        ed.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
    },
    {
      title: "Callout / Note Box",
      category: "Advanced & Structure",
      description: "Highlight important context with an emoji callout box.",
      shortcut: "note",
      icon: <LightbulbFilament size={18} weight="fill" className="text-amber-400" />,
      action: (ed) => {
        ed.chain()
          .focus()
          .toggleBlockquote()
          .insertContent("💡 **Note:** ")
          .run();
      },
    },
    {
      title: "Quote",
      category: "Advanced & Structure",
      description: "Capture a quotation or citation.",
      shortcut: ">",
      icon: <Quotes size={18} />,
      action: (ed) => ed.chain().focus().toggleBlockquote().run(),
    },
    {
      title: "Highlight Text",
      category: "Advanced & Structure",
      description: "Mark key terms with an electric color highlight.",
      shortcut: "mark",
      icon: <Highlighter size={18} className="text-yellow-400" />,
      action: (ed) => ed.chain().focus().toggleHighlight({ color: "#fef08a" }).run(),
    },
    {
      title: "Inline Code",
      category: "Advanced & Structure",
      description: "Format short inline variable or command.",
      shortcut: "`",
      icon: <Code size={18} />,
      action: (ed) => ed.chain().focus().toggleCode().run(),
    },
  ];

  const filteredCommands = commands.filter(
    (cmd) =>
      cmd.title.toLowerCase().includes(query.toLowerCase()) ||
      cmd.description.toLowerCase().includes(query.toLowerCase()) ||
      (cmd.shortcut && cmd.shortcut.toLowerCase().includes(query.toLowerCase()))
  );

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    if (!isOpen) {
      setQuery("");
      return;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % (filteredCommands.length || 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filteredCommands.length) % (filteredCommands.length || 1));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (filteredCommands[selectedIndex] && editor) {
          // Remove the slash typed
          const { state } = editor;
          const { from } = state.selection;
          editor.commands.deleteRange({ from: Math.max(0, from - 1), to: from });
          filteredCommands[selectedIndex].action(editor);
          onClose();
        }
      } else if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, selectedIndex, filteredCommands, editor, onClose]);

  if (!isOpen) return null;

  // Group commands by category
  const categories = Array.from(new Set(filteredCommands.map((c) => c.category)));

  return (
    <div
      ref={menuRef}
      style={{
        top: `${Math.min(position.top, window.innerHeight - 420)}px`,
        left: `${Math.min(position.left, window.innerWidth - 340)}px`,
      }}
      className="fixed z-50 w-80 rounded-xl bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border border-zinc-200 dark:border-zinc-800 shadow-2xl shadow-black/50 overflow-hidden flex flex-col p-1.5 animate-slide-down"
    >
      {/* Search Header */}
      <div className="px-2 py-1.5 mb-1 flex items-center gap-2 border-b border-zinc-100 dark:border-zinc-800/80">
        <input
          type="text"
          placeholder="Filter blocks (e.g. h1, list, code, table, note)..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
          className="w-full bg-transparent text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none"
        />
        <span className="text-[10px] font-mono text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">
          ESC
        </span>
      </div>

      {/* Commands List grouped by category */}
      <div className="flex flex-col max-h-80 overflow-y-auto gap-1 pr-1 custom-scrollbar">
        {filteredCommands.length === 0 ? (
          <div className="p-4 text-xs text-zinc-500 text-center">No matching Notion block found</div>
        ) : (
          categories.map((cat) => {
            const catCommands = filteredCommands.filter((c) => c.category === cat);
            return (
              <div key={cat} className="flex flex-col gap-0.5">
                <div className="px-2 pt-2 pb-1 text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
                  {cat}
                </div>
                {catCommands.map((cmd) => {
                  const globalIndex = filteredCommands.findIndex((c) => c.title === cmd.title);
                  const isSelected = selectedIndex === globalIndex;
                  return (
                    <button
                      key={cmd.title}
                      type="button"
                      onClick={() => {
                        if (editor) {
                          const { state } = editor;
                          const { from } = state.selection;
                          editor.commands.deleteRange({ from: Math.max(0, from - 1), to: from });
                          cmd.action(editor);
                          onClose();
                        }
                      }}
                      onMouseEnter={() => setSelectedIndex(globalIndex)}
                      className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-colors ${
                        isSelected
                          ? "bg-brand-500/10 text-brand-500 dark:text-brand-400"
                          : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/60"
                      }`}
                    >
                      <div
                        className={`p-1.5 rounded-md shrink-0 ${
                          isSelected
                            ? "bg-brand-500/20 text-brand-500 dark:text-brand-400"
                            : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400"
                        }`}
                      >
                        {cmd.icon}
                      </div>
                      <div className="flex flex-col flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                            {cmd.title}
                          </span>
                          {cmd.shortcut && (
                            <span className="text-[10px] font-mono text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded">
                              {cmd.shortcut}
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-zinc-500 truncate">{cmd.description}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
