"use client";

import { Badge } from "@/components/ui/badge";

interface SearchTermChipsProps {
  terms: {
    deviceTerms: string[];
    technologyTerms: string[];
    subjectTerms: string[];
  };
}

export default function SearchTermChips({ terms }: SearchTermChipsProps) {
  const renderTermSection = (title: string, termsList: string[], color: string) => {
    return (
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-gray-700">{title}</h3>
        <div className="flex flex-wrap gap-2">
          {termsList.length > 0 ? (
            termsList.map((term, index) => (
              <Badge key={index} variant="secondary" className={color}>
                {term}
              </Badge>
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
    <div className="space-y-6">
      {/* Device Terms */}
      {renderTermSection(
        "Device Terms",
        terms.deviceTerms,
        "bg-blue-100 text-blue-800 hover:bg-blue-200"
      )}

      {/* Technology Terms */}
      {renderTermSection(
        "Technology Terms",
        terms.technologyTerms,
        "bg-green-100 text-green-800 hover:bg-green-200"
      )}

      {/* Subject Terms */}
      {renderTermSection(
        "Subject Terms",
        terms.subjectTerms,
        "bg-purple-100 text-purple-800 hover:bg-purple-200"
      )}
    </div>
  );
}
