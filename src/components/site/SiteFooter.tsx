import {
  ACTIVE_CHAIN,
  isDeployed,
  explorerAddress,
  CONTRACTS,
} from "@/config/chain";
export function SiteFooter() {
  return (
    <footer className="relative bg-[hsl(var(--surface-sunken))]">
      {/* background and surface-sunken are one percentage point of lightness
          apart, so nothing here needed a 17%-lightness rule to separate it --
          that line WAS the seam. A ramp above the edge carries the step. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 -top-24 h-24 bg-gradient-to-b from-transparent to-[hsl(var(--surface-sunken))]"
      />
      <div className="container mx-auto px-6 py-12">
        <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-xs">
            <div className="flex items-center gap-2 tracking-tight">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-foreground text-background">
                <svg
                  viewBox="0 0 24 24"
                  className="h-3.5 w-3.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                >
                  <path
                    d="M3 7.5 12 13l9-5.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <rect x="3" y="5" width="18" height="14" rx="2.5" />
                </svg>
              </span>{" "}
              xmail
            </div>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Encrypted email addressed to a wallet. Built on{" "}
              {ACTIVE_CHAIN.shortName}.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-x-12 gap-y-2 text-sm sm:grid-cols-2">
            <FooterLink href="#layers">How it works</FooterLink>
            <FooterLink href="https://docs.robinhood.com/chain/" external>
              Chain docs
            </FooterLink>
            <FooterLink href={ACTIVE_CHAIN.explorerUrl} external>
              Block explorer
            </FooterLink>
            {isDeployed && (
              <FooterLink
                href={explorerAddress(CONTRACTS.messageAnchor)}
                external
              >
                Anchor contract
              </FooterLink>
            )}
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-2 border-t border-white/[0.06] pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} xmail</p>
          <p>
            {isDeployed ? (
              <>Contracts live on {ACTIVE_CHAIN.name}</>
            ) : (
              <>
                Contracts not yet deployed — on-chain verification is disabled
              </>
            )}
          </p>
        </div>
      </div>
    </footer>
  );
}
function FooterLink({
  href,
  children,
  external,
}: {
  href: string;
  children: React.ReactNode;
  external?: boolean;
}) {
  return (
    <a
      href={href}
      {...(external ? { target: "_blank", rel: "noreferrer noopener" } : {})}
      className="text-muted-foreground transition-colors hover:text-foreground"
    >
      {children}
    </a>
  );
}
