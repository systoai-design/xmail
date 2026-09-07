import { Lock, Star, Link2, Paperclip } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

/**
 * A row in the message list.
 *
 * Gmail's row is the right density model, but it has nothing to say about
 * whether a message is what the sender actually sent. That is the one thing
 * xmail knows and Gmail cannot, so verification state is a first-class column
 * here rather than an afterthought.
 *
 * No hover transform: a list of rows that each grow under the cursor makes a
 * dense list feel unstable while you scan it. The row states its hover with
 * background alone.
 */

interface EmailRowProps {
  id: string;
  sender: string;
  senderName?: string | null;
  subject: string;
  preview: string;
  timestamp: string;
  read: boolean;
  starred: boolean;
  encrypted: boolean;
  paid?: boolean;
  anchored?: boolean;
  hasAttachment?: boolean;
  selected: boolean;
  onSelect: (checked: boolean) => void;
  onStarToggle: () => void;
  onClick: () => void;
}

const shortAddress = (a: string) =>
  a.length > 18 ? `${a.slice(0, 6)}…${a.slice(-4)}` : a;

function formatTimestamp(ts: string) {
  const date = new Date(ts);
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  if (sameDay) {
    return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  }
  const sameYear = date.getFullYear() === now.getFullYear();
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
  });
}

export const EmailRow = ({
  sender,
  senderName,
  subject,
  preview,
  timestamp,
  read,
  starred,
  encrypted,
  anchored,
  hasAttachment,
  selected,
  onSelect,
  onStarToggle,
  onClick,
}: EmailRowProps) => {
  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      className={cn(
        "group relative flex cursor-pointer items-center gap-3 border-b border-border/60 px-4 py-2.5 transition-colors duration-150",
        read ? "bg-transparent" : "bg-white/[0.025]",
        "hover:bg-white/[0.05] focus-visible:bg-white/[0.05] focus-visible:outline-none",
        selected && "bg-primary/[0.07]",
      )}
    >
      {/* Unread is carried by a rail rather than bold-everything, so the eye can
          find new mail without the whole row shouting. */}
      <span
        aria-hidden="true"
        className={cn(
          "absolute inset-y-0 left-0 w-[2px]",
          !read ? "bg-foreground/70" : "bg-transparent",
        )}
      />

      <Checkbox
        checked={selected}
        onCheckedChange={onSelect}
        onClick={(e) => e.stopPropagation()}
        className="shrink-0"
        aria-label={`Select message from ${senderName ?? sender}`}
      />

      <button
        onClick={(e) => {
          e.stopPropagation();
          onStarToggle();
        }}
        aria-label={starred ? "Unstar" : "Star"}
        className="shrink-0 text-muted-foreground/60 transition-colors hover:text-foreground"
      >
        <Star className={cn("h-4 w-4", starred && "fill-foreground text-foreground")} />
      </button>

      {/* Sender: a nickname when the contact book knows one, the address when it
          does not. The address stays monospaced so it stays scannable. */}
      <div className="w-44 shrink-0 truncate">
        {senderName ? (
          <span className={cn("text-sm", !read && "font-medium")}>{senderName}</span>
        ) : (
          <span className={cn("font-mono text-[13px]", !read && "font-medium")}>
            {shortAddress(sender)}
          </span>
        )}
      </div>

      <div className="flex min-w-0 flex-1 items-center gap-2">
        {encrypted && <Lock className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />}
        <span className={cn("shrink-0 truncate text-sm", !read && "font-medium")}>
          {subject}
        </span>
        <span className="truncate text-sm text-muted-foreground/70">— {preview}</span>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {hasAttachment && <Paperclip className="h-3.5 w-3.5 text-muted-foreground/50" />}
        {anchored && (
          <span
            title="Integrity anchor verified on-chain"
            className="inline-flex items-center gap-1 rounded-full bg-[hsl(var(--verified)/0.12)] px-1.5 py-0.5 text-[10px] text-[hsl(var(--verified))]"
          >
            <Link2 className="h-2.5 w-2.5" />
            verified
          </span>
        )}
      </div>

      <div
        className={cn(
          "w-20 shrink-0 text-right text-xs tabular-nums",
          read ? "text-muted-foreground/70" : "text-foreground/80",
        )}
      >
        {formatTimestamp(timestamp)}
      </div>
    </div>
  );
};
