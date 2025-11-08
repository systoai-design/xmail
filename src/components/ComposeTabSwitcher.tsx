import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface ComposeWindow {
  id: string;
  draftId?: string | null;
  subject?: string;
  isMinimized: boolean;
}

interface ComposeTabSwitcherProps {
  windows: ComposeWindow[];
  activeWindowId: string;
  onWindowClick: (windowId: string) => void;
  onWindowClose: (windowId: string) => void;
}

export const ComposeTabSwitcher = ({
  windows,
  activeWindowId,
  onWindowClick,
  onWindowClose,
}: ComposeTabSwitcherProps) => {
  if (windows.length === 0) return null;

  return (
    <div className="fixed bottom-0 right-4 flex gap-1 z-40">
      {windows.map((window) => (
        <div
          key={window.id}
          onClick={() => onWindowClick(window.id)}
          className={cn(
            "flex items-center gap-2 px-3 py-2 bg-background border-t border-l border-r border-border rounded-t-lg cursor-pointer transition-all",
            window.id === activeWindowId && !window.isMinimized
              ? "bg-muted/30"
              : "hover:bg-muted/20"
          )}
        >
          <span className="text-sm font-medium truncate max-w-[150px]">
            {window.subject || 'New Message'}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5"
            onClick={(e) => {
              e.stopPropagation();
              onWindowClose(window.id);
            }}
          >
            <X className="w-3 h-3" />
          </Button>
        </div>
      ))}
    </div>
  );
};
