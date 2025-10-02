// components/RelatedTermBadge.tsx
"use client";

import { Badge } from "@/components/ui/badge";
import { PlusIcon } from "lucide-react";
import { toast } from "sonner";

type TermCategory = 'deviceTerms' | 'technologyTerms' | 'subjectTerms';

interface RelatedTermBadgeProps {
  term: string;
  category: TermCategory;
  onAddTerm: (term: string, category: TermCategory) => void;
}

export function RelatedTermBadge({ term, category, onAddTerm }: RelatedTermBadgeProps) {
  const handleClick = () => {
    onAddTerm(term, category);
    toast.success(`"${term}" added to ${category.replace('Terms', '')} terms.`);
  };

  return (
    <Badge
      onClick={handleClick}
      variant="outline"
      className="group relative cursor-pointer overflow-hidden transition-all duration-200 ease-in-out hover:scale-105 hover:shadow-md"
    >
      <span className="inline-block transition-transform duration-200 ease-in-out group-hover:translate-x-4">
        {term}
      </span>
      <div className="absolute inset-y-0 left-0 flex w-6 items-center justify-center bg-inherit bg-opacity-40 opacity-0 group-hover:opacity-100 transition-opacity rounded-md rounded-l-md rounded-r-none">
        <PlusIcon className="h-4 w-4 text-primary" />
      </div>
    </Badge>
  );
}