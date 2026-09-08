import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Wordmark } from "./Wordmark";
import { cn } from "@/lib/utils";
import { SocialLinks } from "@/components/SocialLinks";
import { GlowButton } from "./GlowButton";
// Absolute, not bare fragments. These used to be "#layers" and friends, which
// resolve to nothing on any page that is not the landing page -- so every nav
// item was dead on /docs and /pitch.
const NAV = [
  { label: "How it works", href: "/#layers" },
  { label: "Verify", href: "/#verify" },
  { label: "Features", href: "/#security" },
  { label: "Pricing", href: "/#pricing" },
  { label: "FAQ", href: "/#faq" },
];
export function SiteHeader({ onConnect }: { onConnect?: () => void }) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => {
    // Passive listener + a boolean means at most two renders across the whole
    // scroll, rather than one per frame.
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-colors duration-300",
        // Without a backdrop, page content scrolls straight under the logo and
        // CTA and reads as text overlapping the nav. The pill alone is not
        // enough: it only covers its own bounds.
        scrolled
          ? "border-b border-white/[0.07] bg-[hsl(var(--background)/0.72)] backdrop-blur-xl"
          : "bg-gradient-to-b from-[hsl(var(--background))] via-[hsl(var(--background)/0.85)] to-transparent",
      )}
    >
      <div className="container mx-auto flex h-20 items-center px-6">
        <a href="/" className="shrink-0">
          <Wordmark />
        </a>

        {/* The nav rides in its own pill rather than sitting loose on the page, so it stays legible over the light field behind it. */}
        <nav
          className={cn(
            "pill absolute left-1/2 hidden -translate-x-1/2 items-center gap-1 border p-1.5 transition-all duration-300 lg:flex",
            scrolled
              ? "border-white/10 bg-black/40 backdrop-blur-xl"
              : "border-white/[0.06] bg-white/[0.03] backdrop-blur-md",
          )}
        >
          {NAV.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className="text-l3 pill px-4 py-2 text-sm transition-colors hover:bg-white/[0.06] hover:text-white"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          {/* Written months ago and rendered nowhere until now. */}
          <SocialLinks className="hidden lg:flex" />
          <GlowButton
            onClick={onConnect}
            className="hidden !min-h-[40px] !px-5 !py-2 sm:inline-flex"
          >
            Get started
          </GlowButton>
          <button
            type="button"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
            className="text-l3 flex h-10 w-10 items-center justify-center rounded-xl transition-colors hover:bg-white/[0.06] lg:hidden"
          >
            {menuOpen ? (
              <X className="h-4 w-4" />
            ) : (
              <Menu className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="glass border-y border-white/10 lg:hidden">
          <nav className="container mx-auto flex flex-col gap-1 px-6 py-4">
            {NAV.map((item) => (
              <a
                key={item.label}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className="text-l3 rounded-xl px-3 py-2.5 text-sm transition-colors hover:bg-white/[0.06] hover:text-white"
              >
                {item.label}
              </a>
            ))}
            {/* Docs lives here and in the footer rather than in the desktop
                pill: that pill is absolutely centred, so it overlaps the CTA
                rather than pushing it, and at 1024px it already clears it by
                only 45px. A sixth item puts the collision straight back. */}
            <Link
              to="/docs"
              onClick={() => setMenuOpen(false)}
              className="text-l3 rounded-xl px-3 py-2.5 text-sm transition-colors hover:bg-white/[0.06] hover:text-white"
            >
              Documentation
            </Link>
            <Button size="sm" className="pill mt-2 h-10" onClick={onConnect}>
              Get started
            </Button>
            <SocialLinks className="mt-3 justify-center" />
          </nav>
        </div>
      )}
    </header>
  );
}
