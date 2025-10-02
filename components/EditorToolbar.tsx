"use client";

import { useRef } from "react";
import type { Editor } from "@tiptap/core";
import { Bold, Italic, Strikethrough } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EditorToolbarProps {
  editor: Editor | null;
}

export default function EditorToolbar({ editor }: EditorToolbarProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  if (!editor) return null;

  return (
    <div
      ref={menuRef}
      className="flex gap-1 p-1 bg-white border rounded-lg shadow-md"
    >
      <Button
        size="sm"
        variant={editor.isActive("bold") ? "default" : "ghost"}
        onClick={() => editor.chain().focus().toggleBold().run()}
        aria-label="Bold"
      >
        <Bold className="h-4 w-4" />
      </Button>
      <Button
        size="sm"
        variant={editor.isActive("italic") ? "default" : "ghost"}
        onClick={() => editor.chain().focus().toggleItalic().run()}
        aria-label="Italic"
      >
        <Italic className="h-4 w-4" />
      </Button>
      <Button
        size="sm"
        variant={editor.isActive("strike") ? "default" : "ghost"}
        onClick={() => editor.chain().focus().toggleStrike().run()}
        aria-label="Strikethrough"
      >
        <Strikethrough className="h-4 w-4" />
      </Button>
    </div>
  );
}
