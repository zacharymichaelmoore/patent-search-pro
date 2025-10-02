"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface ProvisionalPatentEditorProps {
  onContentChange?: (content: string) => void;
}

export default function ProvisionalPatentEditor({
  onContentChange,
}: ProvisionalPatentEditorProps) {
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const editor = useEditor({
    extensions: [StarterKit],
    content: "<p>Start typing your provisional patent description here...</p>",
    editorProps: {
      attributes: {
        class:
          "prose prose-sm sm:prose lg:prose-lg xl:prose-xl focus:outline-none min-h-[500px] max-w-none p-4",
      },
    },
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      // Get HTML content
      const html = editor.getHTML();
      // Convert to plain text for term extraction
      const text = editor.getText();
      if (onContentChange) {
        onContentChange(text);
      }
    },
  });

  const handleGenerate = async () => {
    if (!prompt.trim()) return;

    setIsGenerating(true);
    try {
      const response = await fetch("/api/generate-description", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate description");
      }

      // Clear the editor first
      editor?.commands.setContent("");

      // Read the streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error("No response body");
      }

      let accumulatedText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        accumulatedText += chunk;

        // Update editor with accumulated text
        // Convert plain text to HTML paragraphs
        const htmlContent = accumulatedText
          .split("\n\n")
          .map((para) => `<p>${para.replace(/\n/g, "<br>")}</p>`)
          .join("");

        editor?.commands.setContent(htmlContent);
      }

      toast.success("Patent description generated successfully!");
    } catch (error) {
      console.error("Error generating description:", error);
      toast.error("Failed to generate description. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleFileUpload = () => {
    toast.info("File upload feature will be available soon.");
  };

  return (
    <div className="space-y-4">
      {/* Prompt Input Section */}
      <div className="space-y-2">
        <label htmlFor="prompt" className="text-sm font-medium text-gray-700">
          Describe your invention
        </label>
        <div className="flex gap-2">
          <Input
            id="prompt"
            type="text"
            placeholder="Enter your invention description"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="flex-1"
            disabled={isGenerating}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleGenerate();
              }
            }}
          />
          <Button
            onClick={handleGenerate}
            disabled={!prompt.trim() || isGenerating}
          >
            {isGenerating ? "Generating..." : "Generate Description"}
          </Button>
        </div>
      </div>

      {/* File Upload Button */}
      <div>
        <Button variant="outline" onClick={handleFileUpload}>
          Upload File
        </Button>
      </div>

      {/* TipTap Editor */}
      <div className="border rounded-lg bg-white shadow-sm h-[50vh] overflow-scroll">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
