"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useDebounce } from "use-debounce";
import ProvisionalPatentEditor from "@/components/ProvisionalPatentEditor";
// import SearchTermChips from "@/components/SearchTermChips";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { LogOut } from "lucide-react";
import markdownToTxt from "markdown-to-text";
import SearchQueryPreview from "@/components/SearchQueryPreview";

type TermCategory = "deviceTerms" | "technologyTerms" | "subjectTerms";

interface SearchTermsState {
  deviceTerms: string[];
  technologyTerms: string[];
  subjectTerms: string[];
}

export default function Home() {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasGeneratedDescription, setHasGeneratedDescription] = useState(false);

  const [relatedTermsCache, setRelatedTermsCache] = useState<
    Record<string, string[]>
  >({});
  const [isPreloading, setIsPreloading] = useState(false);

  const [editorContent, setEditorContent] = useState("");
  const [debouncedContent] = useDebounce(editorContent, 2000);

  const [searchTerms, setSearchTerms] = useState<SearchTermsState>({
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
    const extractAndPreloadTerms = async () => {
      const plainTextContent = markdownToTxt(debouncedContent);
      if (!plainTextContent || plainTextContent.trim().length < 20) {
        setSearchTerms({
          deviceTerms: [],
          technologyTerms: [],
          subjectTerms: [],
        });
        setRelatedTermsCache({});
        return;
      }

      setIsExtractingTerms(true);
      let newSearchTerms: SearchTermsState | null = null;
      try {
        const response = await fetch("/api/extract-terms", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ documentText: plainTextContent }),
        });

        if (!response.ok) throw new Error("Failed to extract terms");

        newSearchTerms = await response.json();
        setSearchTerms(newSearchTerms!);
      } catch (error) {
        console.error("Error extracting terms:", error);
        toast.error("Failed to extract search terms");
      } finally {
        setIsExtractingTerms(false);
      }

      if (newSearchTerms) {
        setIsPreloading(true);
        const allTerms = [
          ...newSearchTerms.deviceTerms,
          ...newSearchTerms.technologyTerms,
          ...newSearchTerms.subjectTerms,
        ];

        // The functional update to setRelatedTermsCache will use the latest state,
        // so we don't need a stale closure over relatedTermsCache here.
        const termsToFetch = allTerms.filter(
          (term) => !relatedTermsCache[term]
        );

        if (termsToFetch.length === 0) {
          setIsPreloading(false);
          return;
        }

        try {
          const promises = termsToFetch.map((term) =>
            fetch("/api/get-related-terms", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ term }),
            }).then((res) => res.json().then((data) => ({ term, data })))
          );

          const results = await Promise.all(promises);

          setRelatedTermsCache((prevCache) => {
            const newCache = { ...prevCache };
            results.forEach(({ term, data }) => {
              newCache[term] = data;
            });
            return newCache;
          });
        } catch (error) {
          console.error("Error preloading related terms:", error);
        } finally {
          setIsPreloading(false);
        }
      }
    };

    extractAndPreloadTerms();
    // THIS IS THE CORRECTED LINE:
    // Only run this effect when the source text changes.
  }, [debouncedContent]);

  const handleGenerateDescription = async () => {
    if (!prompt.trim()) return;

    setIsGenerating(true);
    setEditorContent("");

    try {
      const response = await fetch("/api/generate-description", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });

      if (!response.ok || !response.body) throw new Error("Streaming failed");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        setEditorContent((prev) => prev + decoder.decode(value));
      }

      setHasGeneratedDescription(true);
      toast.success("Description generated successfully!");
    } catch (error) {
      console.error("Error generating description:", error);
      toast.error("Failed to generate description.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExit = () => {
    setHasGeneratedDescription(false);
    setPrompt("");
    setEditorContent("");
    setSearchTerms({ deviceTerms: [], technologyTerms: [], subjectTerms: [] });
    setRelatedTermsCache({});
    toast.info("Session reset.");
  };

  const handleFileUpload = () => {
    toast.info("File upload feature will be available soon.");
  };

  const handleAddTerm = (term: string, category: TermCategory) => {
    setSearchTerms((prevTerms) => {
      const currentCategoryTerms = prevTerms[category];
      if (currentCategoryTerms.includes(term)) {
        toast.info(`"${term}" is already in the list.`);
        return prevTerms;
      }
      return {
        ...prevTerms,
        [category]: [...currentCategoryTerms, term],
      };
    });
  };

  const handleBeginSearch = async () => {
    try {
      toast.loading("Starting patent search...");
      
      const response = await fetch("/api/start-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ searchTerms }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to start search");
      }

      const data = await response.json();
      toast.success("Patent search started!");
      
      // Navigate to status page
      router.push(`/search/${data.jobId}`);
    } catch (error) {
      console.error("Error starting search:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to start patent search"
      );
    }
  };

  const handleRemoveTerm = (termToRemove: string, category: TermCategory) => {
    setSearchTerms((prevTerms) => {
      const currentCategoryTerms = prevTerms[category];
      return {
        ...prevTerms,
        [category]: currentCategoryTerms.filter(
          (term) => term !== termToRemove
        ),
      };
    });
    toast.error(`"${termToRemove}" removed.`);
  };

  return (
    <div className="flex-col bg-gray-50">
      <header className="border-b bg-white shadow-sm">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              AI Patent Assistant
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Draft your provisional patent and discover prior art
            </p>
          </div>
          {hasGeneratedDescription && (
            <Button onClick={handleExit} variant="outline">
              <LogOut className="mr-2 h-4 w-4" />
              Exit
            </Button>
          )}
        </div>
      </header>

      <main className="flex-1 container mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3 bg-white rounded-lg border shadow-sm p-6 flex flex-col">
            {!hasGeneratedDescription && (
              <>
                <h2 className="text-lg font-semibold mb-4">
                  Provisional Patent Description
                </h2>
                <div className="space-y-4 mb-4">
                  <div className="space-y-2">
                    <label
                      htmlFor="prompt"
                      className="text-sm font-medium text-gray-700"
                    >
                      Describe your invention
                    </label>
                    <div className="flex gap-2">
                      <Input
                        id="prompt"
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="e.g., a smart hamster with a neural implant"
                        disabled={isGenerating}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleGenerateDescription();
                        }}
                      />
                      <Button
                        onClick={handleGenerateDescription}
                        disabled={!prompt.trim() || isGenerating}
                      >
                        {isGenerating
                          ? "Generating..."
                          : "Generate Description"}
                      </Button>
                    </div>
                  </div>
                  <Button variant="outline" onClick={handleFileUpload}>
                    Upload File
                  </Button>
                </div>
              </>
            )}

            <div className="flex-1">
              <ProvisionalPatentEditor
                content={editorContent}
                onContentChange={setEditorContent}
              />
            </div>
          </div>

          <div className="lg:col-span-2 h-fit bg-white rounded-lg border shadow-sm p-6 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Search Query Builder</h2>
              {(isExtractingTerms || isPreloading) && (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <div className="animate-spin h-4 w-4 border-2 border-gray-300 border-t-gray-600 rounded-full"></div>
                  {isExtractingTerms ? "Analyzing..." : "Fetching synonyms..."}
                </div>
              )}
            </div>

            <div className="flex-1 mb-4">
              {hasSearchTerms ? (
                <SearchQueryPreview
                  terms={searchTerms}
                  onAddTerm={handleAddTerm}
                  onRemoveTerm={handleRemoveTerm}
                  relatedTermsCache={relatedTermsCache}
                  isPreloading={isPreloading}
                />
              ) : (
                <div className="flex h-full items-center justify-center rounded-lg border-2 border-dashed bg-gray-50/50">
                  <p className="text-center text-sm text-gray-500">
                    Your interactive search query will be built here
                    <br />
                    once terms are extracted from your description.
                  </p>
                </div>
              )}
            </div>

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
