import React, { useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Collaboration from "@tiptap/extension-collaboration";
import CollaborationCursor from "@tiptap/extension-collaboration-cursor";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Table from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import Highlight from "@tiptap/extension-highlight";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { createLowlight, common } from "lowlight";

import * as Y from "yjs";
import { HocuspocusProvider } from "@hocuspocus/provider";
import { useAuth } from "../../context/AuthContext.js";
import { BubbleMenu } from "./BubbleMenu.js";
import { SlashCommandMenu } from "./SlashCommandMenu.js";
import { TableMenu } from "./TableMenu.js";

const lowlight = createLowlight(common);

interface CollaborativeEditorProps {
  ydoc: Y.Doc;
  provider: HocuspocusProvider;
  readOnly?: boolean;
}

export const CollaborativeEditor: React.FC<CollaborativeEditorProps> = ({
  ydoc,
  provider,
  readOnly = false,
}) => {
  const { user } = useAuth();
  const [slashMenuOpen, setSlashMenuOpen] = useState(false);
  const [slashMenuPos, setSlashMenuPos] = useState({ top: 0, left: 0 });

  const editor = useEditor({
    editable: !readOnly,
    extensions: [
      StarterKit.configure({
        history: false, // Yjs handles undo/redo
        codeBlock: false, // Lowlight handles code blocks
      }),
      Collaboration.configure({
        document: ydoc,
        field: "default",
      }),
      CollaborationCursor.configure({
        provider,
        user: {
          name: user?.name || "Guest",
          color: user?.color || "#6366f1",
        },
      }),
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      Highlight.configure({
        multicolor: true,
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-brand-400 underline underline-offset-2 hover:text-brand-300",
        },
      }),
      Placeholder.configure({
        placeholder: "Start typing or type '/' for blocks...",
      }),
      CodeBlockLowlight.configure({
        lowlight,
      }),
    ],
    editorProps: {
      attributes: {
        class:
          "prose prose-invert max-w-none focus:outline-none text-zinc-800 dark:text-zinc-200 min-h-[600px] leading-relaxed",
      },
      handleKeyDown: (view, event) => {
        if (event.key === "/" && !slashMenuOpen) {
          const { state } = view;
          const { from } = state.selection;
          const coords = view.coordsAtPos(from);
          setSlashMenuPos({ top: coords.bottom + 8, left: coords.left });
          setSlashMenuOpen(true);
        } else if (slashMenuOpen && (event.key === "Escape" || event.key === "Backspace")) {
          setSlashMenuOpen(false);
        }
        return false;
      },
    },
  });

  return (
    <div className="relative w-full max-w-4xl mx-auto px-6 py-8">
      {/* Table Action Controls */}
      <TableMenu editor={editor} />

      {/* Floating Selection Bubble Menu */}
      <BubbleMenu editor={editor} />

      {/* Slash Command Dropdown */}
      <SlashCommandMenu
        editor={editor}
        isOpen={slashMenuOpen}
        onClose={() => setSlashMenuOpen(false)}
        position={slashMenuPos}
      />

      {/* ProseMirror Content Area */}
      <EditorContent editor={editor} />
    </div>
  );
};
