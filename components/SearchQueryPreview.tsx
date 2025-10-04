"use client";

import { QueryTerm } from "./QueryTerm"; // The new interactive term component

interface SearchTermsState {
  deviceTerms: string[];
  technologyTerms: string[];
  subjectTerms: string[];
}

type TermCategory = "deviceTerms" | "technologyTerms" | "subjectTerms";

interface SearchQueryPreviewProps {
  terms: SearchTermsState;
  onAddTerm: (term: string, category: TermCategory) => void;
  onRemoveTerm: (term: string, category: TermCategory) => void;
  relatedTermsCache: Record<string, string[]>;
  isPreloading: boolean;
}

export default function SearchQueryPreview({
  terms,
  onAddTerm,
  onRemoveTerm,
  relatedTermsCache,
  isPreloading,
}: SearchQueryPreviewProps) {
  const combinedDeviceAndTechTerms = [
    ...terms.deviceTerms,
    ...terms.technologyTerms,
  ];

  // Helper to determine if a term belongs to the 'device' or 'technology' category
  const getCategory = (term: string): "deviceTerms" | "technologyTerms" => {
    return terms.deviceTerms.includes(term) ? "deviceTerms" : "technologyTerms";
  };

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {/* Renders the (Device OR Technology) group */}
        <div className="p-3 border rounded-md bg-gray-50/50">
          <p className="text-xs font-semibold text-gray-500 mb-2">
            DEVICES / TECHNOLOGIES
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {combinedDeviceAndTechTerms.map((term, index) => (
              <div key={term} className="flex items-center gap-2">
                <QueryTerm
                  term={term}
                  category={getCategory(term)}
                  onAddTerm={onAddTerm}
                  onRemoveTerm={onRemoveTerm}
                  relatedTerms={relatedTermsCache[term] || []}
                  isPreloading={isPreloading}
                />
                {index < combinedDeviceAndTechTerms.length - 1 && (
                  <span className="text-xs font-mono text-gray-400">OR</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {combinedDeviceAndTechTerms.length > 0 &&
          terms.subjectTerms.length > 0 && (
            <div className="flex justify-center py-1">
              <span className="text-sm font-bold font-mono text-gray-600">
                AND
              </span>
            </div>
          )}

        {/* Renders the (Subject) group */}
        {terms.subjectTerms.length > 0 && (
          <div className="p-3 border rounded-md bg-gray-50/50">
            <p className="text-xs font-semibold text-gray-500 mb-2">SUBJECTS</p>
            <div className="flex flex-wrap items-center gap-2">
              {terms.subjectTerms.map((term, index) => (
                <div key={term} className="flex items-center gap-2">
                  <QueryTerm
                    term={term}
                    category="subjectTerms"
                    onAddTerm={onAddTerm}
                    onRemoveTerm={onRemoveTerm}
                    relatedTerms={relatedTermsCache[term] || []}
                    isPreloading={isPreloading}
                  />
                  {index < terms.subjectTerms.length - 1 && (
                    <span className="text-xs font-mono text-gray-400">OR</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}