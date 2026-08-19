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
} from "@phosphor-icons/react";

interface SlashCommandMenuProps {
  editor: Editor | null;
  isOpen: boolean;
  onClose: () => void;
  position: { top: number; left: number };
}

interface CommandItem {
  title: string;
  description: string;
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
  const [filter, setFilter] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);

  const commands: CommandItem[] = [
    {
      title: "Text",
      description: "Just start typing with plain text.",
      icon: <TextT size={18} />,
      action: (ed) => ed.chain().focus().setParagraph().run(),
    },
    {
      title: "Heading 1",
      description: "Big section heading.",
      icon: <TextHOne size={18} weight="bold" />,
      action: (ed) => ed.chain().focus().toggleHeading({ level: 1 }).run(),
    },
    {
      title: "Heading 2",
      description: "Medium section heading.",
      icon: <TextHTwo size={18} weight="bold" />,
      action: (ed) => ed.chain().focus().toggleHeading({ level: 2 }).run(),
    },
    {
      title: "Heading 3",
      description: "Small section sub-heading.",
      icon: <TextHThree size={18} weight="bold" />,
      action: (ed) => ed.chain().focus().toggleHeading({ level: 3 }).run(),
    },
    {
      title: "Bullet List",
      description: "Create a simple bulleted list.",
      icon: <ListBullets size={18} />,
      action: (ed) => ed.chain().focus().toggleBulletList().run(),
    },
    {
      title: "Numbered List",
      description: "Create a list with numbering.",
      icon: <ListNumbers size={18} />,
      action: (ed) => ed.chain().focus().toggleOrderedList().run(),
    },
    {
      title: "Task Checklist",
      description: "Track tasks with interactive checkboxes.",
      icon: <CheckSquare size={18} />,
      action: (ed) => ed.chain().focus().toggleTaskList().run(),
    },
    {
      title: "Code Snippet",
      description: "Capture code snippet with syntax highlighting.",
      icon: <CodeBlock size={18} />,
      action: (ed) => ed.chain().focus().toggleCodeBlock().run(),
    },
    {
      title: "Table",
      description: "Insert a 3x3 editable table.",
      icon: <Table size={18} />,
      action: (ed) =>
        ed.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
    },
    {
      title: "Quote",
      description: "Capture a blockquote or citation.",
      icon: <Quotes size={18} />,
      action: (ed) => ed.chain().focus().toggleBlockquote().run(),
    },
    {
      title: "Divider",
      description: "Visually divide blocks with a horizontal rule.",
      icon: <Minus size={18} />,
      action: (ed) => ed.chain().focus().setHorizontalRule().run(),
    },
  ];

  const filteredCommands = commands.filter(
    (cmd) =>
      cmd.title.toLowerCase().includes(filter.toLowerCase()) ||
      cmd.description.toLowerCase().includes(filter.toLowerCase())
  );

  useEffect(() => {
    setSelectedIndex(0);
  }, [filter]);

  useEffect(() => {
    if (!isOpen) return;

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
          editor.commands.deleteRange({ from: from - 1, to: from });
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

  return (
    <div
      ref={menuRef}
      style={{
        top: `${Math.min(position.top, window.innerHeight - 350)}px`,
        left: `${Math.min(position.left, window.innerWidth - 300)}px`,
      }}
      className="fixed z-50 w-72 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl shadow-black/40 overflow-hidden flex flex-col p-1 animate-slide-down"
    >
      <div className="px-3 py-1.5 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider border-b border-zinc-100 dark:border-zinc-800/80 mb-1">
        Blocks & Elements
      </div>

      <div className="flex flex-col max-h-64 overflow-y-auto gap-0.5">
        {filteredCommands.length === 0 ? (
          <div className="p-3 text-xs text-zinc-500 text-center">No matching block found</div>
        ) : (
          filteredCommands.map((cmd, idx) => (
            <button
              key={cmd.title}
              type="button"
              onClick={() => {
                if (editor) {
                  const { state } = editor;
                  const { from } = state.selection;
                  editor.commands.deleteRange({ from: from - 1, to: from });
                  cmd.action(editor);
                  onClose();
                }
              }}
              onMouseEnter={() => setSelectedIndex(idx)}
              className={`flex items-center gap-2.5 p-2 rounded-lg text-left transition-colors ${
                selectedIndex === idx
                  ? "bg-brand-500/10 text-brand-400"
                  : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/60"
              }`}
            >
              <div
                className={`p-1.5 rounded-md ${
                  selectedIndex === idx
                    ? "bg-brand-500/20 text-brand-400"
                    : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400"
                }`}
              >
                {cmd.icon}
              </div>
              <div className="flex flex-col flex-1 min-w-0">
                <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                  {cmd.title}
                </span>
                <span className="text-[11px] text-zinc-500 truncate">{cmd.description}</span>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
};
