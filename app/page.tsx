"use client";

import { useState, useEffect } from "react";
import { useDebounce } from "use-debounce";
import ProvisionalPatentEditor from "@/components/ProvisionalPatentEditor";
import SearchTermChips from "@/components/SearchTermChips";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function Home() {
  const [editorContent, setEditorContent] = useState("");
  const [debouncedContent] = useDebounce(editorContent, 2000); // 2 second debounce
  const [searchTerms, setSearchTerms] = useState({
    deviceTerms: [],
    technologyTerms: [],
    subjectTerms: [],
  });
  const [isExtractingTerms, setIsExtractingTerms] = useState(false);

  const hasSearchTerms =
    searchTerms.deviceTerms.length > 0 ||
    searchTerms.technologyTerms.length > 0 ||
    searchTerms.subjectTerms.length > 0;

  // Extract terms whenever debounced content changes
  useEffect(() => {
    const extractTerms = async () => {
      if (!debouncedContent || debouncedContent.trim().length < 20) {
        // Reset terms if content is too short
        setSearchTerms({
          deviceTerms: [],
          technologyTerms: [],
          subjectTerms: [],
        });
        return;
      }

      setIsExtractingTerms(true);
      try {
        const response = await fetch("/api/extract-terms", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ documentText: debouncedContent }),
        });

        if (!response.ok) {
          throw new Error("Failed to extract terms");
        }

        const terms = await response.json();
        setSearchTerms(terms);
      } catch (error) {
        console.error("Error extracting terms:", error);
        toast.error("Failed to extract search terms");
      } finally {
        setIsExtractingTerms(false);
      }
    };

    extractTerms();
  }, [debouncedContent]);

  const handleBeginSearch = () => {
    toast.info("Prior art search feature coming soon!");
    console.log("Beginning prior art search with terms:", searchTerms);
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="border-b bg-white shadow-sm">
        <div className="container mx-auto px-6 py-4">
          <h1 className="text-2xl font-bold text-gray-900">
            AI Patent Assistant
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Draft your provisional patent and discover prior art
          </p>
        </div>
      </header>

      {/* Main Content - Two Column Layout */}
      <main className="flex-1 container mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 h-full">
          {/* Left Panel - Patent Editor (60% width on large screens) */}
          <div className="lg:col-span-3 bg-white rounded-lg border shadow-sm p-6">
            <div className="h-full">
              <h2 className="text-lg font-semibold mb-4">
                Provisional Patent Description
              </h2>
              <ProvisionalPatentEditor onContentChange={setEditorContent} />
            </div>
          </div>

          {/* Right Panel - Search Terms (40% width on large screens) */}
          <div className="lg:col-span-2 bg-white rounded-lg border shadow-sm p-6 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Extracted Search Terms</h2>
              {isExtractingTerms && (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <div className="animate-spin h-4 w-4 border-2 border-gray-300 border-t-gray-600 rounded-full"></div>
                  Analyzing...
                </div>
              )}
            </div>

            {/* Search Terms Component */}
            <div className="flex-1 mb-4">
              <SearchTermChips terms={searchTerms} />
            </div>

            {/* Main Control Button */}
            <Button
              onClick={handleBeginSearch}
              disabled={!hasSearchTerms}
              className="w-full py-6 text-base"
              size="lg"
            >
              Begin Prior Art Search
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
