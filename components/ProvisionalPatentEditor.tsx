"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Markdown } from "tiptap-markdown";
import { useEffect } from "react";
// Import the extension logic and rename it to avoid conflicts
import BubbleMenu from "@tiptap/extension-bubble-menu";
import EditorToolbar from "./EditorToolbar";

interface ProvisionalPatentEditorProps {
  content: string;
  onContentChange: (content: string) => void;
}

export default function ProvisionalPatentEditor({
  content,
  onContentChange,
}: ProvisionalPatentEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,

      Markdown.configure({
        html: true,
        linkify: true,
        breaks: true,
      }),
    ],
    content: content,
    editorProps: {
      attributes: {
        class:
          "prose prose-sm sm:prose lg:prose-lg xl:prose-xl focus:outline-none min-h-[500px] max-w-none p-4",
      },
    },
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      const markdown = (editor.storage as any).markdown.getMarkdown();
      onContentChange(markdown);
    },
  });

  useEffect(() => {
    if (editor) {
      const editorContentAsMarkdown = (
        editor.storage as any
      ).markdown.getMarkdown();
      if (content !== editorContentAsMarkdown) {
        editor.commands.setContent(content, { emitUpdate: false });
      }
    }
  }, [content, editor]);

  return (
    <div className="border rounded-lg bg-white shadow-sm h-full overflow-y-auto relative">
      <EditorToolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
}