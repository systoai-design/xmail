import { Lock, Paperclip, Link2, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { isDeployed } from "@/config/chain";

/**
 * The product, as a still.
 *
 * Lived inside Hero.tsx until the pitch deck needed the same picture. Copying
 * it would have meant two inboxes drifting apart the first time a row changed,
 * and the whole point of showing it twice is that it is the same product.
 */
const INBOX_PREVIEW = [
  {
    from: "Dana Okafor",
    handle: "0x7f3a…c19d",
    subject: "Series A term sheet — final",
    preview: "Redlines attached. Everything below clause 7 is agreed.",
    time: "09:41",
    unread: true,
    attachment: true,
    verified: true,
  },
  {
    from: "Marcus Webb",
    handle: "0x2b8e…4a70",
    subject: "Re: audit scope",
    preview: "Confirmed for the 14th. Sending the engagement letter.",
    time: "08:12",
    unread: true,
    attachment: false,
    verified: true,
  },
  {
    from: "Priya Raman",
    handle: "0x9d41…8fe2",
    subject: "Board deck v4",
    preview: "Updated the cohort chart on slide 12 as discussed.",
    time: "Yesterday",
    unread: false,
    attachment: true,
    verified: true,
  },
  {
    from: "Tom Alvarez",
    handle: "0x4c67…21ab",
    subject: "Payroll keys rotated",
    preview: "New key is registered. Old one expires Friday.",
    time: "Yesterday",
    unread: false,
    attachment: false,
    verified: true,
  },
];

export function InboxPreview() {
  return (
    <div className="panel relative overflow-hidden shadow-[var(--shadow-xl)]">
      {/* window chrome */}
      <div className="flex items-center gap-2 border-b border-border bg-[hsl(var(--surface-sunken))] px-4 py-3">
        <div className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-border" />
          <span className="h-2.5 w-2.5 rounded-full bg-border" />
          <span className="h-2.5 w-2.5 rounded-full bg-border" />
        </div>
        <div className="mx-auto flex items-center gap-1.5 rounded-md bg-card px-2.5 py-1 text-[11px] text-muted-foreground">
          <Lock className="h-2.5 w-2.5" /> xmail — Inbox
        </div>
      </div>

      <div className="divide-y divide-border">
        {INBOX_PREVIEW.map((mail) => (
          <div
            key={mail.subject}
            className={cn(
              "flex items-start gap-3 px-4 py-3.5 text-left transition-colors sm:px-5",
              mail.unread && "bg-primary/[0.03]",
            )}
          >
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs text-muted-foreground">
              {mail.from.charAt(0)}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-2">
                <span
                  className={cn(
                    "truncate text-sm",
                    mail.unread ? "font-semibold" : " text-foreground/80",
                  )}
                >
                  {mail.from}
                </span>
                <span className="hidden shrink-0 font-mono text-[11px] text-muted-foreground sm:inline">
                  {mail.handle}
                </span>
                <span className="ml-auto shrink-0 text-[11px] tabular-nums text-muted-foreground">
                  {mail.time}
                </span>
              </div>
              <p
                className={cn(
                  "mt-0.5 truncate text-sm",
                  mail.unread ? "font-medium" : "text-foreground/70",
                )}
              >
                {mail.subject}
              </p>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {mail.preview}
              </p>
            </div>

            <div className="mt-0.5 flex shrink-0 items-center gap-1.5">
              {mail.attachment && (
                <Paperclip className="h-3.5 w-3.5 text-muted-foreground/60" />
              )}
              {mail.verified && isDeployed && (
                <span
                  title="Integrity anchor verified on-chain"
                  className="inline-flex items-center gap-1 rounded-full bg-[hsl(var(--verified)/0.12)] px-1.5 py-0.5 text-[10px] text-[hsl(var(--verified))]"
                >
                  <Link2 className="h-2.5 w-2.5" /> verified
                </span>
              )}
              {mail.unread && (
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between border-t border-border bg-[hsl(var(--surface-sunken))] px-5 py-2.5 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <Lock className="h-3 w-3" />
          AES-256-GCM · decrypted locally
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Star className="h-3 w-3" />
          {INBOX_PREVIEW.filter((m) => m.unread).length} unread
        </span>
      </div>
    </div>
  );
}
