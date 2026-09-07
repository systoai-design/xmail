/**
 * The message list, before it has messages.
 *
 * A skeleton shaped like the real rows rather than a centred spinner: it holds
 * the layout still, so the list does not jump when data lands, and it tells you
 * what is coming rather than only that something is.
 *
 * Widths vary per row because a column of identical bars reads as a graphic
 * rather than as loading content.
 */
const ROWS = [
  { sender: "w-32", subject: "w-48", preview: "w-64" },
  { sender: "w-28", subject: "w-64", preview: "w-40" },
  { sender: "w-36", subject: "w-40", preview: "w-56" },
  { sender: "w-24", subject: "w-56", preview: "w-32" },
  { sender: "w-32", subject: "w-36", preview: "w-52" },
  { sender: "w-28", subject: "w-52", preview: "w-44" },
];

export function MessageListSkeleton() {
  return (
    <div aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading your messages</span>
      {ROWS.map((row, i) => (
        <div
          key={i}
          className="flex items-center gap-3 border-b border-border/60 px-4 py-3"
          // Staggered so the row group reads as one surface settling rather
          // than six things blinking in unison.
          style={{ animationDelay: `${i * 90}ms` }}
        >
          <div className="h-4 w-4 shrink-0 rounded-sm bg-white/[0.06]" />
          <div className="h-4 w-4 shrink-0 rounded-sm bg-white/[0.06]" />
          <div className={`h-3.5 shrink-0 animate-pulse rounded bg-white/[0.07] ${row.sender}`} />
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <div className={`h-3.5 animate-pulse rounded bg-white/[0.07] ${row.subject}`} />
            <div className={`hidden h-3.5 animate-pulse rounded bg-white/[0.04] sm:block ${row.preview}`} />
          </div>
          <div className="h-3 w-12 shrink-0 animate-pulse rounded bg-white/[0.05]" />
        </div>
      ))}
    </div>
  );
}
