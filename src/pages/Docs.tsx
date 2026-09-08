import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, Check, Copy } from "lucide-react";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SectionField } from "@/components/site/SectionField";
import { openConnect } from "@/lib/events";
import { useWallet } from "@/hooks/useWallet";
import { useNavigate } from "react-router-dom";
import {
  ACTIVE_CHAIN,
  CONTRACTS,
  isDeployed,
  explorerAddress,
} from "@/config/chain";

/**
 * Public documentation.
 *
 * Written for someone deciding whether to trust this, not for someone who has
 * already decided. That means the limits get their own section rather than a
 * footnote -- a privacy product that only documents what it protects is a
 * privacy product whose documentation cannot be checked.
 *
 * Every number and address here is read from the same config the app runs on,
 * so a page that says "live on X" is saying it because the app is on X.
 */

const SECTIONS = [
  { id: "what", label: "What xmail is" },
  { id: "start", label: "Getting started" },
  { id: "keys", label: "Your keys" },
  { id: "sending", label: "Sending mail" },
  { id: "credits", label: "Credits" },
  { id: "encryption", label: "How the encryption works" },
  { id: "chain", label: "What goes on-chain" },
  { id: "verify", label: "Verify a message yourself" },
  { id: "limits", label: "What we can still see" },
  { id: "contracts", label: "Network and contracts" },
];

export default function Docs() {
  const { connected } = useWallet();
  const navigate = useNavigate();
  const [active, setActive] = useState(SECTIONS[0].id);

  const openWallet = () => (connected ? navigate("/inbox") : openConnect());

  // Highlight the section actually in view rather than the last one clicked,
  // so the rail stays honest when someone scrolls instead of navigating.
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible) setActive(visible.target.id);
      },
      { rootMargin: "-96px 0px -70% 0px" },
    );
    SECTIONS.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader onConnect={openWallet} />

      <main>
        <section className="relative pb-12 pt-32 sm:pt-40">
          <SectionField variant="top" />
          <div className="container relative mx-auto px-6">
            {/* 18rem = the w-56 rail plus the gap-16 beside it, so the heading
                shares a left edge with the prose it introduces. */}
            <div className="max-w-3xl lg:ml-72">
              <span className="panel pill text-l4 inline-flex items-center gap-2 px-3 py-1 text-xs">
                Documentation
              </span>
              <h1 className="mt-5 text-balance text-4xl sm:text-5xl">
                How xmail works
              </h1>
              <p className="text-l3 mt-4 max-w-2xl text-pretty text-lg leading-relaxed">
                Encrypted mail addressed to a wallet instead of an inbox. This
                page explains what happens to a message, what the chain is
                actually for, and what xmail can still see &mdash; which is the
                part most encrypted products leave out.
              </p>
              {ACTIVE_CHAIN.testnet && (
                <p className="text-l4 mt-6 max-w-2xl text-sm leading-relaxed">
                  xmail is currently running on {ACTIVE_CHAIN.name}. Everything
                  described here is live, but it settles on a test network:
                  credits are free and no transaction moves anything of value.
                </p>
              )}
            </div>
          </div>
        </section>

        <div className="container relative mx-auto px-6 pb-24">
          <div className="flex gap-16">
            {/* The rail is desktop-only. On a phone it would push the content
                it indexes below the fold, which is the opposite of a table of
                contents. */}
            <nav
              aria-label="On this page"
              className="sticky top-28 hidden h-fit w-56 shrink-0 lg:block"
            >
              <p className="text-l5 mb-3 text-xs uppercase tracking-wider">
                On this page
              </p>
              <ul className="space-y-1">
                {SECTIONS.map((s) => (
                  <li key={s.id}>
                    <a
                      href={`#${s.id}`}
                      className={
                        active === s.id
                          ? "block rounded-lg bg-white/[0.05] px-3 py-1.5 text-sm text-foreground"
                          : "text-l4 block rounded-lg px-3 py-1.5 text-sm transition-colors hover:text-foreground"
                      }
                    >
                      {s.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>

            <div className="min-w-0 max-w-2xl space-y-16">
              <Doc id="what" title="What xmail is">
                <P>
                  xmail is email where the address is a wallet. There is no
                  signup, no password, and no email address anywhere in the
                  system. You connect a wallet, and that wallet is your
                  identity.
                </P>
                <P>
                  Every message is encrypted in your browser before it is sent.
                  What reaches our servers is ciphertext we could not read if we
                  wanted to, because the key that would open it never leaves
                  your device. Alongside each message, a short proof is written
                  to a public blockchain &mdash; not the message, a fingerprint
                  of it &mdash; so anyone can check later that what they are
                  reading is exactly what was sent.
                </P>
                <P>
                  Those two things are the whole product. The first means we
                  cannot read your mail. The second means you do not have to
                  take our word for it.
                </P>
              </Doc>

              <Doc id="start" title="Getting started">
                <Steps
                  items={[
                    {
                      t: "Connect a wallet",
                      d: `Any wallet that works on ${ACTIVE_CHAIN.shortName} — MetaMask, Rabby, Coinbase Wallet and others. You sign a message to prove you hold the address. Signing costs nothing and moves nothing.`,
                    },
                    {
                      t: "Publish your key",
                      d: "Your browser generates an encryption keypair and publishes the public half to a contract on-chain. This is what lets other people write to you, and what stops anyone substituting a different key for yours.",
                    },
                    {
                      t: "Write and send",
                      d: "Enter a recipient's wallet address, write your message, and send. Your browser encrypts it to their published key, you sign the on-chain proof, and it is delivered.",
                    },
                  ]}
                />
                <P>
                  New accounts start with 25 free credits, which reset monthly.
                  There is nothing to install and nothing to uninstall if you
                  decide against it.
                </P>
              </Doc>

              <Doc id="keys" title="Your keys">
                <P>
                  Your encryption key is created in your browser and stays
                  there. We never receive it, so we cannot lose it, leak it, or
                  be compelled to hand it over. That is the point &mdash; and it
                  is also the trade-off, because it means recovery is your
                  responsibility rather than ours.
                </P>
                <Callout>
                  If you lose access to your wallet, mail encrypted under that
                  key cannot be recovered by anyone, including us. Export a
                  backup from the key manager and keep it somewhere safe.
                </Callout>
                <P>
                  The key manager can export your key protected by a password,
                  import it into another browser, or move it between devices by
                  QR code. If you register a new key, future mail works normally
                  &mdash; only messages sealed to the old key are affected.
                </P>
              </Doc>

              <Doc id="sending" title="Sending mail">
                <DL
                  items={[
                    [
                      "Undo send",
                      "Nothing irreversible happens for seven seconds after you press send. The message is saved as a draft first, so closing the tab inside that window loses nothing. After it, the message is encrypted, delivered and anchored — and an anchor on a public chain cannot be withdrawn, so there is no honest undo past that point.",
                    ],
                    [
                      "Parked mail",
                      "You can write to an address that has not registered a key yet. The message is held, encrypted, and delivered automatically the moment that address publishes a key. You are not charged for a parked message until it is delivered.",
                    ],
                    [
                      "Attachments",
                      "Attachments are encrypted with the same scheme as the message body, in your browser, before upload. They are never readable to us.",
                    ],
                    [
                      "Reply and forward",
                      "Both work the way you expect. A forwarded message is re-encrypted to the new recipient's key, because the original was sealed to yours and nobody else can open it.",
                    ],
                  ]}
                />
              </Doc>

              <Doc id="credits" title="Credits">
                <P>
                  A credit is one message. Specifically: one credit covers
                  encrypting, delivering and anchoring a message body of up to
                  10,000 characters. Longer bodies cost one more credit per
                  additional 10,000 characters, and attachments cost one more
                  per 5&nbsp;MB.
                </P>
                <P>
                  Gas for the on-chain proof is included in the credit. There
                  are no per-seat charges and no monthly minimum &mdash; an
                  empty month costs nothing.
                </P>
                {ACTIVE_CHAIN.testnet && (
                  <Callout>
                    During the beta, credits are free. The prices on the pricing
                    page are what they will be when xmail moves to mainnet;
                    nothing is charged today.
                  </Callout>
                )}
              </Doc>

              <Doc id="encryption" title="How the encryption works">
                <P>
                  Two ciphers, each doing the job it is good at. The message
                  itself is encrypted with <Code>AES-256-GCM</Code>, which is
                  fast and handles large content. The key to that message is
                  then wrapped with <Code>RSA-OAEP-2048</Code> using the
                  recipient's published public key, so only their private key
                  can unwrap it.
                </P>
                <P>
                  A fresh AES key and initialisation vector are generated for
                  every single message. Two identical messages sent twice
                  produce completely different ciphertext, which means the
                  stored data leaks nothing through repetition.
                </P>
                <P>
                  All of it happens in your browser, using the platform's own{" "}
                  <Code>SubtleCrypto</Code> implementation. The plaintext exists
                  on your device and the recipient's, and nowhere else.
                </P>
              </Doc>

              <Doc id="chain" title="What goes on-chain">
                <P>
                  Never your message. Two things, and it is worth being precise
                  about both.
                </P>
                <DL
                  items={[
                    [
                      "Your public key",
                      "Published to a registry contract where only the address owner can write its own entry. There is no admin function and no privileged writer — key substitution is not forbidden by a permission check, there is simply no valid transaction that performs it. Senders read your key from the chain before encrypting, so if we ever served a different one, their browser would refuse to send.",
                    ],
                    [
                      "A fingerprint of each message",
                      "A keccak256 commitment over the ciphertext plus the sender and recipient addresses. It proves a specific message existed, unaltered, between two addresses at a given block — and reveals nothing whatsoever about what it said.",
                    ],
                  ]}
                />
                <P>
                  The proof is signed by the sender, before the message is
                  stored. If you decline the signature, nothing is sent and
                  nothing is charged. That ordering is deliberate: a message
                  that goes out unproven does not do the thing xmail says it
                  does.
                </P>
              </Doc>

              <Doc id="verify" title="Verify a message yourself">
                <P>
                  You do not have to trust this page. The commitment is
                  reproducible from public information, so you can recompute it
                  and check the chain directly.
                </P>
                <Pre>{`keccak256(
  abi.encodePacked(ciphertext, senderAddress, recipientAddress)
)`}</Pre>
                <P>
                  Recompute that over the stored ciphertext, then call{" "}
                  <Code>verify()</Code> on the anchor contract with the result
                  and the two addresses. It returns whether the anchor exists,
                  when it was recorded, and in which block. If a message had
                  been altered by so much as one character, the hash would not
                  match and the call would return false.
                </P>
                <P>
                  The{" "}
                  <Link to="/#verify" className="text-primary hover:underline">
                    verification demo on the home page
                  </Link>{" "}
                  does exactly this against a real anchored message, live,
                  while you edit the text.
                </P>
              </Doc>

              <Doc id="limits" title="What we can still see">
                <P>
                  Delivery needs an envelope. Sender address, recipient address
                  and send time are stored unencrypted, because without them a
                  message cannot be routed to a mailbox at all. Subject lines,
                  message bodies and attachments are never readable to us.
                </P>
                <Callout>
                  This makes xmail <strong>pseudonymous</strong>, not anonymous.
                  Wallet addresses are public and permanent, and anyone watching
                  the chain can see that two addresses exchanged a message and
                  when. They cannot see what it said.
                </Callout>
                <P>
                  If an address is publicly tied to a real identity &mdash;
                  because it has been posted somewhere, or funded from an
                  exchange account &mdash; then the metadata around your
                  messages is tied to that identity too. That is a property of
                  public blockchains, not something xmail can encrypt away, and
                  you should plan around it rather than assume otherwise.
                </P>
              </Doc>

              <Doc id="contracts" title="Network and contracts">
                <P>
                  xmail runs on {ACTIVE_CHAIN.name}
                  {ACTIVE_CHAIN.testnet ? " during the beta" : ""}, an Arbitrum
                  Orbit L2 that uses ETH for gas. Everything below is public and
                  independently inspectable.
                </P>
                <div className="panel divide-y divide-white/[0.06] overflow-hidden">
                  <Row label="Network" value={ACTIVE_CHAIN.name} />
                  <Row label="Chain ID" value={String(ACTIVE_CHAIN.id)} mono />
                  <Row label="RPC" value={ACTIVE_CHAIN.rpcUrl} mono />
                  {isDeployed && (
                    <>
                      <Row
                        label="Key registry"
                        value={CONTRACTS.keyRegistry}
                        mono
                        href={explorerAddress(CONTRACTS.keyRegistry)}
                      />
                      <Row
                        label="Message anchor"
                        value={CONTRACTS.messageAnchor}
                        mono
                        href={explorerAddress(CONTRACTS.messageAnchor)}
                      />
                    </>
                  )}
                </div>
                {!isDeployed && (
                  <Callout>
                    Contract addresses are not configured in this build, so
                    on-chain verification is disabled here.
                  </Callout>
                )}
              </Doc>

              <div className="panel flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-base">Still deciding?</p>
                  <p className="text-l4 mt-1 text-sm">
                    Read the short version, or just try it.
                  </p>
                </div>
                <div className="flex shrink-0 gap-3">
                  <Link
                    to="/pitch"
                    className="panel pill px-5 py-2.5 text-sm transition-colors hover:bg-white/[0.06]"
                  >
                    The short version
                  </Link>
                  <button
                    type="button"
                    onClick={openWallet}
                    className="pill bg-foreground px-5 py-2.5 text-sm text-background transition-opacity hover:opacity-90"
                  >
                    Connect wallet
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}

/* ---------- building blocks ---------- */

function Doc({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    // scroll-mt clears the fixed header, which would otherwise sit on top of
    // every heading you jumped to.
    <section id={id} className="scroll-mt-28">
      <h2 className="text-balance text-2xl sm:text-3xl">{title}</h2>
      <div className="mt-5 space-y-4">{children}</div>
    </section>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-l3 text-pretty leading-relaxed">{children}</p>
  );
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="rounded bg-white/[0.06] px-1.5 py-0.5 font-mono text-[0.85em] text-foreground">
      {children}
    </code>
  );
}

function Pre({ children }: { children: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="panel relative overflow-hidden">
      <pre className="overflow-x-auto p-5 font-mono text-xs leading-relaxed text-foreground">
        {children}
      </pre>
      <button
        type="button"
        aria-label={copied ? "Copied" : "Copy"}
        onClick={() => {
          void navigator.clipboard.writeText(children);
          setCopied(true);
          setTimeout(() => setCopied(false), 1600);
        }}
        className="text-l4 absolute right-3 top-3 rounded-lg p-2 transition-colors hover:text-foreground"
      >
        {copied ? (
          <Check className="h-3.5 w-3.5" />
        ) : (
          <Copy className="h-3.5 w-3.5" />
        )}
      </button>
    </div>
  );
}

function Callout({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <p className="text-l2 text-pretty text-sm leading-relaxed">{children}</p>
    </div>
  );
}

function Steps({ items }: { items: { t: string; d: string }[] }) {
  return (
    <ol className="space-y-4">
      {items.map((s, i) => (
        <li key={s.t} className="flex gap-4">
          <span className="text-l4 panel pill flex h-7 w-7 shrink-0 items-center justify-center text-xs">
            {i + 1}
          </span>
          <div className="min-w-0">
            <p className="text-base">{s.t}</p>
            <p className="text-l3 mt-1 text-pretty text-sm leading-relaxed">
              {s.d}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}

function DL({ items }: { items: [string, string][] }) {
  return (
    <dl className="space-y-5">
      {items.map(([term, def]) => (
        <div key={term}>
          <dt className="text-base">{term}</dt>
          <dd className="text-l3 mt-1 text-pretty text-sm leading-relaxed">
            {def}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function Row({
  label,
  value,
  mono = false,
  href,
}: {
  label: string;
  value: string;
  mono?: boolean;
  href?: string;
}) {
  const text = mono ? "font-mono text-xs" : "text-sm";
  return (
    <div className="flex items-center justify-between gap-4 px-5 py-3.5">
      <span className="text-l4 shrink-0 text-sm">{label}</span>
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className={`${text} inline-flex min-w-0 items-center gap-1.5 truncate text-primary hover:underline`}
        >
          <span className="truncate">{value}</span>
          <ArrowUpRight className="h-3 w-3 shrink-0" />
        </a>
      ) : (
        <span className={`${text} min-w-0 truncate text-right`}>{value}</span>
      )}
    </div>
  );
}
