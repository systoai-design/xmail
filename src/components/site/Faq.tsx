import { useState } from "react";
import { Plus } from "lucide-react";
import { ACTIVE_CHAIN } from "@/config/chain";
import { cn } from "@/lib/utils";
import { SectionField } from "./SectionField";
const QUESTIONS = [
  {
    q: "If it's end-to-end encrypted, how does the AI read my mail?",
    a: "It doesn't, unless you ask it to. Drafting and summarising run against plaintext that exists only in your browser, before encryption or after decryption. Nothing readable is sent to a model server without an explicit action on your part, and we can't run one in the background because we never hold your keys.",
  },
  {
    q: "What stops someone swapping my public key for their own?",
    a: "The key registry is a contract where the address owner is the only account that can write its own entry. There is no admin path and no privileged writer, so key substitution isn't forbidden by a permission check — there's simply no valid transaction that performs it.",
  },
  {
    q: "What actually goes on the blockchain?",
    a: "A keccak256 commitment over the ciphertext, plus sender and recipient addresses. Never your message. An anchor proves a specific message existed unaltered between two addresses at a given block, and reveals nothing about what it said.",
  },
  {
    q: "What is a credit, exactly?",
    a: "One credit covers encrypting and anchoring a message with up to 10,000 characters. Longer bodies and attachments cost more, because they cost more to encrypt and store. Gas for the on-chain anchor is included.",
  },
  {
    q: "What happens if I lose my wallet?",
    a: "Your encryption key is sealed by a signature only your wallet can produce, so losing the wallet means losing access to mail encrypted under it. That is the cost of there being no server-side copy for anyone to steal or subpoena. Register a new key and future mail works normally.",
  },
  {
    q: "Do recipients need an account?",
    a: `No. A recipient needs a wallet and a registered public key, both free. There is no signup, no password, and no email address anywhere in the system — addresses on ${ACTIVE_CHAIN.shortName} are the identity.`,
  },
];
export function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section
      id="faq"
      className="relative py-24 sm:py-32"
      aria-labelledby="faq-heading"
    >
      <SectionField variant="left" />
      <div className="container mx-auto px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 id="faq-heading" className="text-balance text-4xl sm:text-5xl">
            Questions worth asking
          </h2>
          <p className="text-l3 mx-auto mt-4 text-pretty text-lg">
            The ones that decide whether this is actually private, rather than
            the ones that are easy to answer.
          </p>
        </div>

        <div className="mx-auto mt-12 max-w-3xl space-y-3">
          {QUESTIONS.map((item, i) => {
            const isOpen = open === i;
            return (
              <div key={item.q} className="panel overflow-hidden">
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : i)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center gap-4 px-6 py-5 text-left"
                >
                  <span className="text-l1 flex-1 text-base">{item.q}</span>
                  <Plus
                    className={cn(
                      "h-4 w-4 shrink-0 text-primary transition-transform duration-300",
                      isOpen && "rotate-45",
                    )}
                  />
                </button>
                <div
                  className="grid transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
                  style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}
                >
                  <div className="overflow-hidden">
                    <p className="text-l3 px-6 pb-5 text-sm leading-relaxed">
                      {item.a}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
