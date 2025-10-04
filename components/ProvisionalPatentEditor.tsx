"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Markdown } from "tiptap-markdown";
import { useEffect } from "react";
import EditorToolbar from "./EditorToolbar";

// Define a type for the editor's storage when using tiptap-markdown
type EditorStorage = {
  markdown: {
    getMarkdown: () => string;
  };
};

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
      // Use the 'as unknown as EditorStorage' pattern
      const markdown = (
        editor.storage as unknown as EditorStorage
      ).markdown.getMarkdown();
      onContentChange(markdown);
    },
  });

  useEffect(() => {
    if (editor) {
      // Use the same pattern here
      const editorContentAsMarkdown = (
        editor.storage as unknown as EditorStorage
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