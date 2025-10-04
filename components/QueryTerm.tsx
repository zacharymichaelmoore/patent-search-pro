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

interface QueryTermProps {
  term: string;
  category: TermCategory;
  onAddTerm: (term: string, category: TermCategory) => void;
  onRemoveTerm: (term: string, category: TermCategory) => void;
  relatedTerms: string[];
  isPreloading: boolean;
}

export function QueryTerm({
  term,
  category,
  onAddTerm,
  onRemoveTerm,
  relatedTerms,
  isPreloading,
}: QueryTermProps) {
  const [isOpen, setIsOpen] = useState(false);
  const closeTimer = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    if (!isOpen) setIsOpen(true);
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
          className="group relative cursor-default overflow-hidden transition-all duration-200 ease-in-out hover:shadow-md bg-gray-100 text-gray-800"
        >
          {/* Add padding to the text to make space for the X icon on hover */}
          <span className="inline-block transition-all duration-200 ease-in-out group-hover:pl-5 pr-1">
            {term}
          </span>
          {/* The X icon for removal */}
          <div
            onClick={handleRemoveClick}
            className="absolute inset-y-0 left-0 flex w-6 items-center justify-center bg-gray-200 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
          >
            <X className="h-3 w-3 text-gray-600 hover:text-red-500" />
          </div>
        </Badge>
      </PopoverTrigger>
      <PopoverContent
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="w-max max-w-xs"
        align="center"
        side="top"
      >
        <div className="space-y-2">
          <h4 className="font-medium leading-none">Related Synonyms</h4>
          <p className="text-sm text-muted-foreground">
            Click a synonym to add it to this group.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 mt-4">
          {isPreloading && relatedTerms.length === 0 ? (
            <div className="text-sm text-gray-500">Loading...</div>
          ) : relatedTerms.length > 0 ? (
            relatedTerms.map((relatedTerm, i) => (
              <RelatedTermBadge
                key={i}
                term={relatedTerm}
                category={category}
                onAddTerm={onAddTerm}
              />
            ))
          ) : (
            <p className="text-xs text-gray-400 italic">No synonyms found.</p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}