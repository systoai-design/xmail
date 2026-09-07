import { Inbox, Send, FileEdit, Star, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Empty states.
 *
 * A single line of grey text centred in a void tells you nothing and offers
 * nothing. Each state here says what the folder is for and, where there is a
 * sensible next action, offers it.
 */

type Tab = "inbox" | "sent" | "drafts" | "starred" | string;

const STATES: Record<
  string,
  { icon: typeof Inbox; title: string; body: string; action?: string }
> = {
  inbox: {
    icon: Inbox,
    title: "Nothing here yet",
    body: "Mail sent to your wallet address lands here, decrypted in your browser. Share your address to receive your first message.",
    action: "Write a message",
  },
  sent: {
    icon: Send,
    title: "No sent messages",
    body: "Messages you send appear here with their on-chain anchor, so you can prove afterwards what you sent and when.",
    action: "Write a message",
  },
  drafts: {
    icon: FileEdit,
    title: "No drafts",
    body: "Drafts save as you type and stay encrypted, so an unfinished message is protected the same way a sent one is.",
    action: "Start a draft",
  },
  starred: {
    icon: Star,
    title: "Nothing starred",
    body: "Star a message to keep it here. Useful for threads you need to find again without searching.",
  },
};

export function EmptyState({ tab, onCompose }: { tab: Tab; onCompose?: () => void }) {
  const state = STATES[tab] ?? STATES.inbox;
  const Icon = state.icon;

  return (
    <div className="flex flex-col items-center justify-center px-6 py-24 text-center">
      <div className="relative mb-5">
        <span
          aria-hidden="true"
          className="absolute inset-0 -m-6 rounded-full bg-[radial-gradient(circle,hsl(0_0%_100%/0.05),transparent_70%)]"
        />
        <span className="relative flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]">
          <Icon className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
        </span>
      </div>

      <h3 className="text-base">{state.title}</h3>
      <p className="mt-2 max-w-sm text-pretty text-sm leading-relaxed text-muted-foreground">
        {state.body}
      </p>

      {state.action && onCompose && (
        <Button onClick={onCompose} size="sm" className="mt-6">
          <Plus className="mr-1.5 h-4 w-4" />
          {state.action}
        </Button>
      )}
    </div>
  );
}
