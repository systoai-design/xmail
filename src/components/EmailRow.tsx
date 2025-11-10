import { Lock, Star } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface EmailRowProps {
  id: string;
  sender: string;
  subject: string;
  preview: string;
  timestamp: string;
  read: boolean;
  starred: boolean;
  encrypted: boolean;
  paid?: boolean;
  selected: boolean;
  onSelect: (checked: boolean) => void;
  onStarToggle: () => void;
  onClick: () => void;
}

export const EmailRow = ({
  id,
  sender,
  subject,
  preview,
  timestamp,
  read,
  starred,
  encrypted,
  paid,
  selected,
  onSelect,
  onStarToggle,
  onClick,
}: EmailRowProps) => {
  const formatTimestamp = (ts: string) => {
    const date = new Date(ts);
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit', 
        hour12: true 
      });
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else if (date.getFullYear() === now.getFullYear()) {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      });
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
      });
    }
  };

  return (
    <div
      className={cn(
        "gmail-email-row group transition-all duration-200 hover:scale-[1.01] hover:bg-muted/20",
        !read && "gmail-email-row-unread",
        selected && "bg-muted/30 border-l-2 border-primary"
      )}
      onClick={onClick}
    >
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Checkbox */}
        <Checkbox
          checked={selected}
          onCheckedChange={onSelect}
          onClick={(e) => e.stopPropagation()}
          className="flex-shrink-0"
        />

        {/* Star */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onStarToggle();
          }}
          className="flex-shrink-0 text-muted-foreground hover:text-yellow-500 transition-all duration-200 hover:scale-110 active:scale-90"
        >
          <Star
            className={cn(
              "w-5 h-5 transition-all duration-200",
              starred && "fill-yellow-500 text-yellow-500 animate-bounce-in"
            )}
          />
        </button>

        {/* Sender */}
        <div
          className={cn(
            "w-48 flex-shrink-0 truncate text-sm",
            !read && "font-bold"
          )}
        >
          {sender.slice(0, 8)}...{sender.slice(-8)}
        </div>

        {/* Subject and Preview */}
        <div className="flex-1 min-w-0 flex items-center gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {encrypted && (
              <Lock className="w-4 h-4 text-primary flex-shrink-0" />
            )}
            <span className={cn(
              "text-sm truncate",
              !read && "font-bold"
            )}>
              {subject}
            </span>
            <span className="text-sm text-muted-foreground truncate">
              — {preview}
            </span>
          </div>

          {/* Badges */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {!read && (
              <Badge variant="default" className="bg-accent text-xs animate-pulse">
                New
              </Badge>
            )}
            {paid && (
              <div className="text-xs bg-accent/20 text-accent px-2 py-1 rounded-full font-bold animate-scale-in">
                ✓
              </div>
            )}
          </div>
        </div>

        {/* Timestamp */}
        <div className={cn(
          "w-24 flex-shrink-0 text-right text-xs text-muted-foreground",
          !read && "font-bold"
        )}>
          {formatTimestamp(timestamp)}
        </div>
      </div>
    </div>
  );
};
