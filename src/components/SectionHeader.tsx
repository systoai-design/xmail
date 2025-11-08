import { ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SectionHeaderProps {
  title: string;
  count: number;
  expanded: boolean;
  onToggle: () => void;
}

export const SectionHeader = ({ 
  title, 
  count, 
  expanded, 
  onToggle 
}: SectionHeaderProps) => {
  return (
    <button
      onClick={onToggle}
      className={cn(
        "gmail-section-header w-full",
        "flex items-center gap-2 px-4 py-2",
        "text-sm font-semibold text-foreground/60",
        "hover:bg-muted/30 transition-colors"
      )}
    >
      {expanded ? (
        <ChevronDown className="w-4 h-4" />
      ) : (
        <ChevronRight className="w-4 h-4" />
      )}
      <span>{title}</span>
      <span className="text-muted-foreground">({count})</span>
    </button>
  );
};
