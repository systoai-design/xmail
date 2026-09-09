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
  { label: "Docs", href: "/docs", route: true },
];
// Tighter at lg, roomier from xl. Six items at px-4 do not fit beside the CTA
// on a 1024px laptop; at px-3 they do, with room to spare.
const NAV_ITEM =
  "text-l3 pill px-3 py-2 text-sm transition-colors hover:bg-white/[0.06] hover:text-white xl:px-4";

const MENU_ITEM =
  "text-l3 rounded-xl px-3 py-2.5 text-sm transition-colors hover:bg-white/[0.06] hover:text-white";

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
      {/*
        A three-column grid, not a flex row with an absolutely centred pill.
        The pill used to be positioned out of flow, which is why every width
        problem in this header turned into an OVERLAP rather than a squeeze --
        an out-of-flow element cannot push its neighbours, so it simply landed
        on top of them. Adding one nav item was enough to put the X mark over
        the FAQ link.

        `1fr auto 1fr` keeps the nav genuinely centred in the viewport, because
        the two side columns are equal by construction rather than by luck, and
        anything that grows now pushes instead of colliding.
      */}
      <div className="container mx-auto grid h-20 grid-cols-[1fr_auto_1fr] items-center gap-4 px-6">
        <a href="/" className="justify-self-start">
          <Wordmark />
        </a>

        {/* The nav rides in its own pill rather than sitting loose on the page, so it stays legible over the light field behind it. */}
        <nav
          className={cn(
            "pill hidden items-center gap-1 border p-1.5 transition-all duration-300 lg:flex",
            scrolled
              ? "border-white/10 bg-black/40 backdrop-blur-xl"
              : "border-white/[0.06] bg-white/[0.03] backdrop-blur-md",
          )}
        >
          {NAV.map((item) =>
            item.route ? (
              <Link
                key={item.label}
                to={item.href}
                className={NAV_ITEM}
              >
                {item.label}
              </Link>
            ) : (
              <a key={item.label} href={item.href} className={NAV_ITEM}>
                {item.label}
              </a>
            ),
          )}
        </nav>

        <div className="flex items-center gap-3 justify-self-end">
          {/* Written months ago and rendered nowhere until now. They wait for
              xl: at lg the six-item pill and the CTA already use the width, and
              the footer and the mobile menu both carry these links. */}
          <SocialLinks className="hidden xl:flex" />
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
            {/* One source for both menus now that Docs is a real nav item --
                it used to be appended separately here, which would have
                rendered it twice the moment it joined NAV. */}
            {NAV.map((item) =>
              item.route ? (
                <Link
                  key={item.label}
                  to={item.href}
                  onClick={() => setMenuOpen(false)}
                  className={MENU_ITEM}
                >
                  {item.label}
                </Link>
              ) : (
                <a
                  key={item.label}
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  className={MENU_ITEM}
                >
                  {item.label}
                </a>
              ),
            )}
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
