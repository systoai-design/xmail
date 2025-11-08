import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useWallet } from '@solana/wallet-adapter-react';
import { 
  Menu, 
  X, 
  Plus, 
  Inbox, 
  Star, 
  Send, 
  FileEdit, 
  LogOut,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { KeyManagement } from '@/components/KeyManagement';
import { Logo } from '@/components/Logo';
import { cn } from '@/lib/utils';

interface GmailSidebarProps {
  unreadCount: number;
  sentCount: number;
  draftsCount: number;
  starredCount: number;
  onDisconnect: () => void;
  onCompose: () => void;
}

export const GmailSidebar = ({ 
  unreadCount, 
  sentCount, 
  draftsCount,
  starredCount,
  onDisconnect,
  onCompose
}: GmailSidebarProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { publicKey } = useWallet();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const getActiveTab = () => {
    const searchParams = new URLSearchParams(location.search);
    return searchParams.get('tab') || 'inbox';
  };

  const activeTab = getActiveTab();

  const navItems = [
    { 
      label: 'Inbox', 
      icon: Inbox, 
      value: 'inbox', 
      badge: unreadCount > 0 ? unreadCount : undefined 
    },
    { 
      label: 'Starred', 
      icon: Star, 
      value: 'starred', 
      badge: starredCount > 0 ? starredCount : undefined 
    },
    { 
      label: 'Sent', 
      icon: Send, 
      value: 'sent', 
      badge: sentCount > 0 ? sentCount : undefined 
    },
    { 
      label: 'Drafts', 
      icon: FileEdit, 
      value: 'drafts', 
      badge: draftsCount > 0 ? draftsCount : undefined 
    },
  ];

  const handleNavClick = (value: string) => {
    navigate(`/inbox?tab=${value}`);
    setMobileOpen(false);
  };

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 flex items-center justify-between border-b border-border">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <Logo size="small" />
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            setCollapsed(!collapsed);
            setMobileOpen(false);
          }}
          className="ml-auto"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
        </Button>
      </div>

      {/* Compose Button */}
      <div className="p-3">
        <Button
          onClick={() => {
            onCompose();
            setMobileOpen(false);
          }}
          className="w-full font-bold shadow-glow justify-start gap-3"
          size={collapsed ? "icon" : "lg"}
        >
          <Plus className="w-5 h-5" />
          {!collapsed && <span>Compose</span>}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.value;
          
          return (
            <button
              key={item.value}
              onClick={() => handleNavClick(item.value)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-3 rounded-lg mb-1 transition-colors",
                "hover:bg-muted/50",
                isActive && "bg-muted text-primary font-semibold",
                !isActive && "text-foreground/80",
                collapsed && "justify-center"
              )}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {!collapsed && (
                <>
                  <span className="flex-1 text-left text-sm">{item.label}</span>
                  {item.badge && (
                    <Badge variant="secondary" className="ml-auto text-xs">
                      {item.badge}
                    </Badge>
                  )}
                </>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-border p-3 space-y-2">
        {!collapsed && publicKey && (
          <div className="px-3 py-2 text-xs text-muted-foreground font-mono truncate">
            {publicKey.toBase58().slice(0, 6)}...{publicKey.toBase58().slice(-6)}
          </div>
        )}
        
        <div className={cn("flex gap-2", collapsed && "flex-col items-center")}>
          <KeyManagement />
          <Button
            onClick={onDisconnect}
            variant="outline"
            size={collapsed ? "icon" : "default"}
            className={cn(!collapsed && "flex-1")}
          >
            <LogOut className="w-4 h-4" />
            {!collapsed && <span className="ml-2">Disconnect</span>}
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "hidden md:flex flex-col bg-background border-r border-border transition-all duration-300",
          collapsed ? "w-20" : "w-64"
        )}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Menu Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setMobileOpen(!mobileOpen)}
        className="md:hidden fixed top-4 left-4 z-50 glass"
      >
        <Menu className="w-5 h-5" />
      </Button>

      {/* Mobile Sidebar Overlay */}
      {mobileOpen && (
        <>
          <div
            className="md:hidden fixed inset-0 bg-black/60 z-40"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="md:hidden fixed left-0 top-0 bottom-0 w-64 bg-background border-r border-border z-50 flex flex-col">
            <div className="p-4 flex items-center justify-between border-b border-border">
              <Logo size="small" />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobileOpen(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            {sidebarContent}
          </aside>
        </>
      )}
    </>
  );
};
