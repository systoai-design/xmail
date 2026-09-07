import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useWallet } from "@/hooks/useWallet";
import {
  Menu,
  X,
  Plus,
  Inbox,
  Star,
  Send,
  FileEdit,
  LogOut,
  ChevronRight,
  Copy,
  Check,
  ShieldCheck,
  ShieldAlert,
  Coins,
  Clock,
  Link2,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { KeyManagement } from "@/components/KeyManagement";
import { ContactBook } from "@/components/ContactBook";
import { Logo } from "@/components/Logo";
import { useEncryptionKeys } from "@/hooks/useEncryptionKeys";
import { useCredits } from "@/hooks/useCredits";
import { useOnChainKey } from "@/hooks/useOnChainKey";
import { BuyCredits } from "@/components/BuyCredits";
import { cn } from "@/lib/utils";

interface GmailSidebarProps {
  className?: string;
  unreadCount: number;
  sentCount: number;
  draftsCount: number;
  starredCount: number;
  onDisconnect: () => void;
  onCompose: () => void;
  mobileOpen?: boolean;
  onMobileOpenChange?: (open: boolean) => void;
  /** Messages written to wallets that have not registered a key yet. */
  parkedCount?: number;
}

export const GmailSidebar = ({
  className,
  unreadCount,
  sentCount,
  draftsCount,
  starredCount,
  onDisconnect,
  onCompose,
  mobileOpen: externalMobileOpen,
  onMobileOpenChange,
  parkedCount = 0,
}: GmailSidebarProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { address } = useWallet();
  const { keysReady } = useEncryptionKeys();
  const { balance } = useCredits();
  const { registered, publishing, publish } = useOnChainKey();
  const [collapsed, setCollapsed] = useState(false);
  const [internalMobileOpen, setInternalMobileOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const mobileOpen = externalMobileOpen !== undefined ? externalMobileOpen : internalMobileOpen;
  const setMobileOpen = onMobileOpenChange || setInternalMobileOpen;

  const activeTab = new URLSearchParams(location.search).get("tab") || "inbox";


  const navItems = [
    { label: "Inbox", icon: Inbox, value: "inbox", badge: unreadCount },
    { label: "Starred", icon: Star, value: "starred", badge: starredCount },
    { label: "Sent", icon: Send, value: "sent", badge: sentCount },
    { label: "Drafts", icon: FileEdit, value: "drafts", badge: draftsCount },
    // Only appears when there is something in it: an always-visible empty
    // folder for an edge case is clutter for everyone who never hits it.
    ...(parkedCount > 0
      ? [{ label: "Parked", icon: Clock, value: "parked", badge: parkedCount }]
      : []),
  ];

  const handleNavClick = (value: string) => {
    navigate(`/inbox?tab=${value}`);
    setMobileOpen(false);
  };

  const copyAddress = async () => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard unavailable; the address is still selectable on screen */
    }
  };

  const sidebarContent = (
    <div className="flex h-full flex-col">
      {/* --- header ------------------------------------------------------- */}
      <div className="flex h-16 items-center gap-2 px-4">
        {!collapsed && (
          <button
            onClick={() => {
              sessionStorage.setItem("fromInbox", "true");
              navigate("/");
              setMobileOpen(false);
            }}
            className="flex items-center gap-2.5 rounded-lg transition-opacity hover:opacity-80"
            aria-label="Back to xmail home"
          >
            <Logo size="small" />
            <span className="text-[15px] tracking-[-0.02em]">xmail</span>
          </button>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className="ml-auto hidden md:inline-flex"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMobileOpen(false)}
          className="ml-auto md:hidden"
          aria-label="Close menu"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* --- compose ------------------------------------------------------ */}
      <div className="px-3 pb-2">
        <Button
          onClick={() => {
            onCompose();
            setMobileOpen(false);
          }}
          className={cn(
            "h-11 w-full bg-primary text-primary-foreground hover:bg-primary-hover",
            collapsed ? "justify-center px-0" : "justify-start gap-3 px-4",
          )}
        >
          <Plus className="h-4 w-4 shrink-0" />
          {!collapsed && <span>Compose</span>}
        </Button>
      </div>

      {/* --- navigation --------------------------------------------------- */}
      <nav className="flex-1 overflow-y-auto px-2 py-1">
        {navItems.map(({ label, icon: Icon, value, badge }) => {
          const isActive = activeTab === value;
          return (
            <button
              key={value}
              onClick={() => handleNavClick(value)}
              aria-current={isActive ? "page" : undefined}
              title={collapsed ? label : undefined}
              className={cn(
                "relative mb-0.5 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                isActive ? "bg-white/[0.07] text-foreground" : "text-foreground/70 hover:bg-white/[0.04]",
                collapsed && "justify-center px-0",
              )}
            >
              {/* Same active rail the message list uses for unread, so "current"
                  reads consistently across the app. */}
              {isActive && !collapsed && (
                <span aria-hidden="true" className="absolute inset-y-1.5 left-0 w-[2px] rounded-full bg-foreground" />
              )}
              <Icon className="h-[18px] w-[18px] shrink-0" />
              {!collapsed && (
                <>
                  <span
                    className={cn(
                      "flex-1 whitespace-nowrap text-left transition-[opacity,transform] duration-300",
                      collapsed ? "-translate-x-1 opacity-0" : "translate-x-0 opacity-100",
                    )}
                  >
                    {label}
                  </span>
                  {badge > 0 && (
                    <span className="tabular-nums text-xs text-muted-foreground">{badge}</span>
                  )}
                </>
              )}
            </button>
          );
        })}

        {!collapsed && (
          <div className="mt-2">
            <ContactBook />
          </div>
        )}
      </nav>

      {/* --- identity ----------------------------------------------------- */}
      <div className="border-t border-border/60 p-3">
        {!collapsed && address && (
          <>
            {/* Credits. Sending is the only thing that spends them, so the
                number lives next to Compose rather than buried in settings. */}
            {balance !== null && (
              <div className="mb-2 flex items-center justify-between rounded-lg bg-white/[0.04] px-3 py-2">
                <span className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Coins className="h-3.5 w-3.5" />
                  Credits
                </span>
                <span
                  className={cn(
                    "text-xs tabular-nums",
                    balance === 0 ? "text-destructive" : "text-foreground",
                  )}
                >
                  {balance}
                </span>
              </div>
            )}

            {balance !== null && (
              <div className="mb-3">
                <BuyCredits
                  trigger={
                    <button className="w-full rounded-lg border border-border/70 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground">
                      Buy more credits
                    </button>
                  }
                />
              </div>
            )}

            {parkedCount > 0 && (
              <div className="mb-2 flex items-center gap-2 px-1 text-xs">
                <Clock className="h-3.5 w-3.5 text-[hsl(var(--warning))]" />
                <span className="text-muted-foreground">
                  {parkedCount} waiting for the recipient to register
                </span>
              </div>
            )}

            {/* Encryption state, read from the real hook rather than assumed. */}
            <div className="mb-2 flex items-center gap-2 px-1 text-xs">
              {keysReady ? (
                <>
                  <ShieldCheck className="h-3.5 w-3.5 text-[hsl(var(--verified))]" />
                  <span className="text-muted-foreground">Encryption ready</span>
                </>
              ) : (
                <>
                  <ShieldAlert className="h-3.5 w-3.5 text-[hsl(var(--warning))]" />
                  <span className="text-muted-foreground">Encryption locked</span>
                </>
              )}
            </div>

            {/* Publishing the key is what makes the database checkable: if we
                ever served a different key for you, the chain would disagree
                and the sender's browser would catch it. */}
            {keysReady && registered === false && (
              <button
                onClick={() => void publish()}
                disabled={publishing}
                className="mb-2 flex w-full items-center gap-2 rounded-lg border border-[hsl(var(--warning)/0.3)] bg-[hsl(var(--warning)/0.08)] px-3 py-2 text-left text-xs"
              >
                {publishing ? (
                  <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
                ) : (
                  <Link2 className="h-3.5 w-3.5 shrink-0 text-[hsl(var(--warning))]" />
                )}
                <span className="text-muted-foreground">
                  {publishing ? "Publishing your key…" : "Publish your key on-chain"}
                </span>
              </button>
            )}
            {keysReady && registered === true && (
              <div className="mb-2 flex items-center gap-2 px-1 text-xs">
                <Link2 className="h-3.5 w-3.5 text-[hsl(var(--verified))]" />
                <span className="text-muted-foreground">Key published on-chain</span>
              </div>
            )}

            <button
              onClick={copyAddress}
              className="group mb-3 flex w-full items-center gap-2 rounded-lg bg-white/[0.04] px-3 py-2 text-left transition-colors hover:bg-white/[0.07]"
              aria-label="Copy wallet address"
            >
              <span className="min-w-0 flex-1">
                <span className="block text-[10px] uppercase tracking-wide text-muted-foreground">
                  Wallet
                </span>
                <span className="block truncate font-mono text-xs">
                  {address.slice(0, 6)}…{address.slice(-6)}
                </span>
              </span>
              {copied ? (
                <Check className="h-3.5 w-3.5 shrink-0 text-[hsl(var(--verified))]" />
              ) : (
                <Copy className="h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
              )}
            </button>
          </>
        )}

        <div className="flex flex-col gap-2">
          <KeyManagement compact={collapsed} />
          <Button
            onClick={onDisconnect}
            variant="ghost"
            size="sm"
            className={cn("w-full text-muted-foreground hover:text-foreground", collapsed && "px-0")}
          >
            <LogOut className="h-4 w-4" />
            {!collapsed && <span className="ml-2">Disconnect</span>}
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <aside
        className={cn(
          "hidden flex-col overflow-hidden border-r border-border/60 bg-[hsl(var(--surface-sunken))] md:flex",
          "transition-[width] duration-[420ms] ease-[cubic-bezier(.16,1,.3,1)]",
          collapsed ? "w-[72px]" : "w-64",
          className,
        )}
      >
        {sidebarContent}
      </aside>

      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm md:hidden"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="fixed bottom-0 left-0 top-0 z-[70] w-72 border-r border-border/60 bg-[hsl(var(--surface-sunken))] md:hidden">
            {sidebarContent}
          </aside>
        </>
      )}
    </>
  );
};

export const useSidebarControl = () => {
  const [isOpen, setIsOpen] = useState(false);
  return { isOpen, setIsOpen };
};
