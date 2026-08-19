import React from "react";
import { Editor } from "@tiptap/react";
import {
  Rows,
  Columns,
  Trash,
} from "@phosphor-icons/react";

interface TableMenuProps {
  editor: Editor | null;
}

export const TableMenu: React.FC<TableMenuProps> = ({ editor }) => {
  if (!editor || !editor.isActive("table")) return null;

  return (
    <div className="flex items-center gap-1 p-1 rounded-lg bg-zinc-900 border border-zinc-800 shadow-lg text-xs text-zinc-300 mb-2">
      <span className="text-[11px] font-semibold text-zinc-500 px-2">Table:</span>

      <button
        type="button"
        onClick={() => editor.chain().focus().addColumnBefore().run()}
        className="px-2 py-1 rounded hover:bg-zinc-800 transition-colors flex items-center gap-1"
        title="Add Column Before"
      >
        <Columns size={13} /> +Col Left
      </button>

      <button
        type="button"
        onClick={() => editor.chain().focus().addColumnAfter().run()}
        className="px-2 py-1 rounded hover:bg-zinc-800 transition-colors flex items-center gap-1"
        title="Add Column After"
      >
        <Columns size={13} /> +Col Right
      </button>

      <button
        type="button"
        onClick={() => editor.chain().focus().deleteColumn().run()}
        className="px-2 py-1 rounded hover:bg-zinc-800 text-rose-400 transition-colors flex items-center gap-1"
        title="Delete Column"
      >
        <Trash size={13} /> Del Col
      </button>

      <div className="w-px h-3.5 bg-zinc-800 mx-0.5" />

      <button
        type="button"
        onClick={() => editor.chain().focus().addRowBefore().run()}
        className="px-2 py-1 rounded hover:bg-zinc-800 transition-colors flex items-center gap-1"
        title="Add Row Above"
      >
        <Rows size={13} /> +Row Above
      </button>

      <button
        type="button"
        onClick={() => editor.chain().focus().addRowAfter().run()}
        className="px-2 py-1 rounded hover:bg-zinc-800 transition-colors flex items-center gap-1"
        title="Add Row Below"
      >
        <Rows size={13} /> +Row Below
      </button>

      <button
        type="button"
        onClick={() => editor.chain().focus().deleteRow().run()}
        className="px-2 py-1 rounded hover:bg-zinc-800 text-rose-400 transition-colors flex items-center gap-1"
        title="Delete Row"
      >
        <Trash size={13} /> Del Row
      </button>

      <div className="w-px h-3.5 bg-zinc-800 mx-0.5" />

      <button
        type="button"
        onClick={() => editor.chain().focus().deleteTable().run()}
        className="px-2 py-1 rounded hover:bg-rose-950/60 text-rose-400 transition-colors flex items-center gap-1"
        title="Delete Table"
      >
        <Trash size={13} /> Remove Table
      </button>
    </div>
  );
};
