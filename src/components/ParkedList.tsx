import { useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { Clock, Trash2, Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { callSecureEndpoint } from "@/lib/secureApi";
import { decryptMessage, importPrivateKey } from "@/lib/encryption";
import { useToast } from "@/hooks/use-toast";
import { emitMailChanged } from "@/lib/events";

/**
 * Mail waiting for its recipient to exist.
 *
 * These were sealed to the sender, because at the time there was no recipient
 * key to seal them to -- which is exactly why they can be listed and read here
 * at all, and why nobody else can read them.
 */

interface Parked {
  id: string;
  to_wallet: string;
  sender_encrypted_subject: string | null;
  created_at: string;
}

const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-6)}`;

export function ParkedList({ onFlush }: { onFlush?: () => void }) {
  const { publicKey, signMessage } = useWallet();
  const { toast } = useToast();
  const [rows, setRows] = useState<Parked[]>([]);
  const [subjects, setSubjects] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  const load = async () => {
    if (!publicKey || !signMessage) return;
    setLoading(true);
    try {
      const res = await callSecureEndpoint("get_parked", {}, publicKey, signMessage);
      const parked: Parked[] = res.parked ?? [];
      setRows(parked);

      // Subjects are ciphertext until this browser opens them.
      const priv = localStorage.getItem("encryption_private_key");
      if (priv && parked.length > 0) {
        const key = await importPrivateKey(priv);
        const out: Record<string, string> = {};
        for (const r of parked) {
          if (!r.sender_encrypted_subject) continue;
          try {
            out[r.id] = await decryptMessage(r.sender_encrypted_subject, key);
          } catch {
            out[r.id] = "(could not decrypt)";
          }
        }
        setSubjects(out);
      }
    } catch (err) {
      console.error("Could not load parked mail:", err);
      toast({ title: "Could not load parked messages", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [publicKey]);

  const discard = async (id: string) => {
    if (!publicKey || !signMessage) return;
    setDeleting(id);
    try {
      await callSecureEndpoint("delete_parked", { parkedId: id }, publicKey, signMessage);
      setRows((r) => r.filter((x) => x.id !== id));
      emitMailChanged();
      toast({ title: "Parked message discarded" });
    } catch {
      toast({ title: "Could not discard", variant: "destructive" });
    } finally {
      setDeleting(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center px-6 py-24 text-center">
        <span className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]">
          <Clock className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
        </span>
        <h3 className="text-base">Nothing parked</h3>
        <p className="mt-2 max-w-sm text-pretty text-sm leading-relaxed text-muted-foreground">
          Messages you write to a wallet that has not registered a key yet wait
          here, and go out on their own once it does.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="border-b border-border/60 px-4 py-3">
        <p className="text-sm text-muted-foreground">
          Waiting for the recipient to register a key. Each one sends by itself the
          next time you open xmail after they do — no credits are charged until then.
        </p>
        <Button size="sm" variant="outline" className="mt-3" onClick={() => onFlush?.()}>
          <Send className="mr-1.5 h-3.5 w-3.5" />
          Check now
        </Button>
      </div>

      {rows.map((r) => (
        <div
          key={r.id}
          className="flex items-center gap-3 border-b border-border/60 px-4 py-3"
        >
          <Clock className="h-4 w-4 shrink-0 text-[hsl(var(--warning))]" />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm">
              {subjects[r.id] || "(no subject)"}
            </div>
            <div className="mt-0.5 font-mono text-xs text-muted-foreground">
              to {short(r.to_wallet)}
            </div>
          </div>
          <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
            {new Date(r.created_at).toLocaleDateString()}
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => discard(r.id)}
            disabled={deleting === r.id}
            aria-label="Discard parked message"
            title="Discard"
          >
            {deleting === r.id ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
          </Button>
        </div>
      ))}
    </div>
  );
}
