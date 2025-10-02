// components/SearchTermChips.tsx
"use client";

import { SearchTerm } from "@/components/SearchTerm";

type TermCategory = "deviceTerms" | "technologyTerms" | "subjectTerms";

interface SearchTermChipsProps {
  terms: {
    deviceTerms: string[];
    technologyTerms: string[];
    subjectTerms: string[];
  };
  onAddTerm: (term: string, category: TermCategory) => void;
  onRemoveTerm: (term: string, category: TermCategory) => void;
  relatedTermsCache: Record<string, string[]>; // Add this
  isPreloading: boolean;
}

export default function SearchTermChips({
  terms,
  onAddTerm,
  onRemoveTerm,
  relatedTermsCache,
  isPreloading,
}: SearchTermChipsProps) {
  const renderTermSection = (
    title: string,
    termsList: string[],
    color: string,
    category: TermCategory
  ) => {
    return (
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-gray-700">{title}</h3>
        <div className="flex flex-wrap gap-2">
          {termsList.length > 0 ? (
            termsList.map((term, index) => (
              <SearchTerm
                key={index}
                term={term}
                color={color}
                category={category}
                onAddTerm={onAddTerm}
                onRemoveTerm={onRemoveTerm}
                relatedTerms={relatedTermsCache[term] || []} // Pass the specific list
                isPreloading={isPreloading} // Pass loading status
              />
            ))
          ) : (
            <p className="text-xs text-gray-400 italic">
              No terms extracted yet
            </p>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 pb-4">
      {renderTermSection(
        "Device Terms",
        terms.deviceTerms,
        "bg-blue-100 text-blue-800",
        "deviceTerms"
      )}
      {renderTermSection(
        "Technology Terms",
        terms.technologyTerms,
        "bg-green-100 text-green-800",
        "technologyTerms"
      )}
      {renderTermSection(
        "Subject Terms",
        terms.subjectTerms,
        "bg-purple-100 text-purple-800",
        "subjectTerms"
      )}
    </div>
  );
}
