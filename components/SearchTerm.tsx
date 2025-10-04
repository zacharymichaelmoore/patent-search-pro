// components/SearchTerm.tsx
"use client";

import { useState, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { X } from "lucide-react";
import { RelatedTermBadge } from "./RelatedTermBadge";

type TermCategory = "deviceTerms" | "technologyTerms" | "subjectTerms";

interface SearchTermProps {
  term: string;
  color: string;
  category: TermCategory;
  onAddTerm: (term: string, category: TermCategory) => void;
  onRemoveTerm: (term: string, category: TermCategory) => void;
  relatedTerms: string[]; // It now receives the list directly
  isPreloading: boolean; // And the global loading status
}

export function SearchTerm({
  term,
  color,
  category,
  onAddTerm,
  onRemoveTerm,
  relatedTerms,
  isPreloading,
}: SearchTermProps) {
  const [isOpen, setIsOpen] = useState(false);
  const closeTimer = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    if (!isOpen) {
      setIsOpen(true);
    }
  };

  const handleMouseLeave = () => {
    closeTimer.current = setTimeout(() => setIsOpen(false), 100);
  };

  const handleRemoveClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onRemoveTerm(term, category);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="outline-none"
      >
        <Badge
          variant="secondary"
          className={`${color} group relative cursor-default overflow-hidden transition-all duration-200 ease-in-out hover:scale-105 hover:shadow-md`}
        >
          <span className="inline-block transition-transform duration-200 ease-in-out group-hover:translate-x-6">
            {term}
          </span>
          <div
            onClick={handleRemoveClick}
            className="absolute inset-0 cursor-pointer flex w-8 items-center justify-center bg-inherit bg-opacity-40 opacity-0 group-hover:opacity-100 transition-opacity rounded-md rounded-r-none"
          >
            <X className="h-4 w-4 text-primary" />
          </div>
        </Badge>
      </PopoverTrigger>
      <PopoverContent
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="w-max max-w-sm"
        align="center"
        side="top"
      >
        <div className="space-y-2">
          <h4 className="font-medium leading-none">Related Terms</h4>
          <p className="text-sm text-muted-foreground">
            Synonyms and alternatives for &quot;{term}&quot;.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 mt-4">
          {isPreloading && relatedTerms.length === 0 ? (
            <div className="text-sm text-gray-500">Loading...</div>
          ) : (
            relatedTerms.map((relatedTerm, i) => (
              <RelatedTermBadge
                key={i}
                term={relatedTerm}
                category={category}
                onAddTerm={onAddTerm}
              />
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
