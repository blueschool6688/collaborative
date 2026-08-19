import React from "react";
import { BubbleMenu as TipTapBubbleMenu, Editor } from "@tiptap/react";
import {
  TextB,
  TextItalic,
  TextStrikethrough,
  Code,
  Highlighter,
  Link,
  TextHOne,
  TextHTwo,
} from "@phosphor-icons/react";

interface BubbleMenuProps {
  editor: Editor | null;
}

export const BubbleMenu: React.FC<BubbleMenuProps> = ({ editor }) => {
  if (!editor) return null;

  const setLink = () => {
    const previousUrl = editor.getAttributes("link").href;
    const url = window.prompt("Enter URL:", previousUrl);

    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };

  return (
    <TipTapBubbleMenu
      editor={editor}
      tippyOptions={{ duration: 150, placement: "top" }}
      className="flex items-center gap-0.5 p-1 rounded-lg bg-zinc-900/95 backdrop-blur-md border border-zinc-800 shadow-xl shadow-black/50 text-zinc-300"
    >
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={`p-1.5 rounded hover:bg-zinc-800 transition-colors ${
          editor.isActive("bold") ? "text-brand-400 bg-zinc-800" : ""
        }`}
        title="Bold (Ctrl+B)"
      >
        <TextB size={15} weight="bold" />
      </button>

      <button
        type="button"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={`p-1.5 rounded hover:bg-zinc-800 transition-colors ${
          editor.isActive("italic") ? "text-brand-400 bg-zinc-800" : ""
        }`}
        title="Italic (Ctrl+I)"
      >
        <TextItalic size={15} />
      </button>

      <button
        type="button"
        onClick={() => editor.chain().focus().toggleStrike().run()}
        className={`p-1.5 rounded hover:bg-zinc-800 transition-colors ${
          editor.isActive("strike") ? "text-brand-400 bg-zinc-800" : ""
        }`}
        title="Strikethrough"
      >
        <TextStrikethrough size={15} />
      </button>

      <button
        type="button"
        onClick={() => editor.chain().focus().toggleCode().run()}
        className={`p-1.5 rounded hover:bg-zinc-800 transition-colors ${
          editor.isActive("code") ? "text-brand-400 bg-zinc-800" : ""
        }`}
        title="Inline Code"
      >
        <Code size={15} />
      </button>

      <button
        type="button"
        onClick={() => editor.chain().focus().toggleHighlight().run()}
        className={`p-1.5 rounded hover:bg-zinc-800 transition-colors ${
          editor.isActive("highlight") ? "text-brand-400 bg-zinc-800" : ""
        }`}
        title="Highlight"
      >
        <Highlighter size={15} />
      </button>

      <button
        type="button"
        onClick={setLink}
        className={`p-1.5 rounded hover:bg-zinc-800 transition-colors ${
          editor.isActive("link") ? "text-brand-400 bg-zinc-800" : ""
        }`}
        title="Add Link"
      >
        <Link size={15} />
      </button>

      <div className="w-px h-4 bg-zinc-700 mx-1" />

      <button
        type="button"
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        className={`p-1.5 rounded hover:bg-zinc-800 transition-colors ${
          editor.isActive("heading", { level: 1 }) ? "text-brand-400 bg-zinc-800" : ""
        }`}
        title="Heading 1"
      >
        <TextHOne size={15} />
      </button>

      <button
        type="button"
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        className={`p-1.5 rounded hover:bg-zinc-800 transition-colors ${
          editor.isActive("heading", { level: 2 }) ? "text-brand-400 bg-zinc-800" : ""
        }`}
        title="Heading 2"
      >
        <TextHTwo size={15} />
      </button>
    </TipTapBubbleMenu>
  );
};
