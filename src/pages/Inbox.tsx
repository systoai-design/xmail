import { useWallet } from '@solana/wallet-adapter-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useEffect, useState, useMemo } from 'react';
import { Search, Loader2, X, RefreshCw, Trash2, Key, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { useEncryptionKeys } from '@/hooks/useEncryptionKeys';
import { callSecureEndpoint } from '@/lib/secureApi';
import { supabase } from '@/integrations/supabase/client';
import { ConfirmDeleteDialog } from '@/components/ConfirmDeleteDialog';
import { GmailSidebar } from '@/components/GmailSidebar';
import { EmailRow } from '@/components/EmailRow';
import { SectionHeader } from '@/components/SectionHeader';
import { ComposeModal } from '@/components/ComposeModal';
import { ComposeTabSwitcher, ComposeWindow } from '@/components/ComposeTabSwitcher';
import { InlineEmailViewer } from '@/components/InlineEmailViewer';
import { SocialLinks } from '@/components/SocialLinks';
import { cn } from '@/lib/utils';
import { openKeyManagement, onKeyImported } from '@/lib/events';

interface EncryptedEmail {
  id: string;
  from_wallet: string;
  to_wallet: string;
  encrypted_subject: string;
  encrypted_body: string;
  timestamp: string;
  read: boolean;
  starred: boolean;
  payment_tx_signature: string | null;
}

interface Draft {
  id: string;
  wallet_address: string;
  to_wallet: string | null;
  encrypted_subject: string | null;
  encrypted_body: string | null;
  created_at: string;
  updated_at: string;
}

const Inbox = () => {
  const { connected, publicKey, disconnect, signMessage } = useWallet();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { keysReady } = useEncryptionKeys();
  const [searchParams] = useSearchParams();
  const tabFromUrl = searchParams.get('tab') || 'inbox';
  
  const [emails, setEmails] = useState<EncryptedEmail[]>([]);
  const [sentEmails, setSentEmails] = useState<EncryptedEmail[]>([]);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEmails, setSelectedEmails] = useState<Set<string>>(new Set());
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  
  // Section expansion states
  const [importantExpanded, setImportantExpanded] = useState(true);
  const [starredExpanded, setStarredExpanded] = useState(true);
  const [allExpanded, setAllExpanded] = useState(true);

  // Multiple compose windows state
  const [composeWindows, setComposeWindows] = useState<ComposeWindow[]>([]);
  const [activeWindowId, setActiveWindowId] = useState<string | null>(null);

  // Inline email viewer state
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [showKeyBanner, setShowKeyBanner] = useState(false);

  // Check for missing key and show banner
  useEffect(() => {
    if (keysReady && connected && publicKey) {
      const hasPrivateKey = !!localStorage.getItem('encryption_private_key');
      setShowKeyBanner(!hasPrivateKey);
    }
  }, [keysReady, connected, publicKey]);

  // Listen for key imports to hide banner
  useEffect(() => {
    return onKeyImported(() => {
      setShowKeyBanner(false);
    });
  }, []);

  const activeTab = tabFromUrl as 'inbox' | 'sent' | 'drafts' | 'starred';

  // Request notification permission
  useEffect(() => {
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
      
      if (Notification.permission === 'default') {
        Notification.requestPermission().then(permission => {
          setNotificationPermission(permission);
        });
      }
    }
  }, []);

  useEffect(() => {
    if (!connected) {
      navigate('/');
      return;
    }
    
    // Try to load emails with a wait for keys
    const loadWithRetry = async () => {
      // Wait for keys with timeout (up to 10 seconds)
      let attempts = 0;
      while (!keysReady && attempts < 20) {
        await new Promise(resolve => setTimeout(resolve, 500));
        attempts++;
      }
      
      if (keysReady) {
        loadEmails();
        loadSentEmails();
        loadDrafts();
      } else {
        setLoading(false);
        toast({
          title: 'Keys Not Ready',
          description: 'Your encryption keys are still being set up. Please wait or reconnect your wallet.',
          variant: 'default',
        });
      }
    };
    
    loadWithRetry();
  }, [connected, navigate, publicKey]);

  // Set up Realtime listener for new emails
  useEffect(() => {
    if (!connected || !publicKey || !keysReady) return;

    console.log('Setting up realtime listener for:', publicKey.toBase58());

    const channel = supabase
      .channel('inbox-updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'encrypted_emails',
          filter: `to_wallet=eq.${publicKey.toBase58()}`
        },
        (payload) => {
          console.log('New email received:', payload);
          
          // Add to emails list
          const newEmail = payload.new as EncryptedEmail;
          setEmails(prev => [newEmail, ...prev]);
          
          // Show browser notification
          if (notificationPermission === 'granted') {
            new Notification('New Encrypted Email', {
              body: `From: ${newEmail.from_wallet.slice(0, 8)}...${newEmail.from_wallet.slice(-8)}`,
              icon: '/favicon.ico',
              badge: '/favicon.ico',
            });
          }
          
          // Show toast
          toast({
            title: '📬 New Email Received',
            description: `From ${newEmail.from_wallet.slice(0, 8)}...${newEmail.from_wallet.slice(-8)}`,
          });
        }
      )
      .subscribe();

    return () => {
      console.log('Cleaning up realtime listener');
      supabase.removeChannel(channel);
    };
  }, [connected, publicKey, keysReady, notificationPermission, toast]);

  const loadEmails = async () => {
    if (!publicKey || !signMessage) return;

    try {
      const response = await callSecureEndpoint(
        'get_inbox',
        {},
        publicKey,
        signMessage
      );
      setEmails(response.emails || []);
    } catch (error) {
      console.error('Error loading emails:', error);
      toast({
        title: 'Error',
        description: 'Failed to load emails',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadSentEmails = async () => {
    if (!publicKey || !signMessage) return;

    try {
      const response = await callSecureEndpoint(
        'get_sent',
        {},
        publicKey,
        signMessage
      );
      setSentEmails(response.emails || []);
    } catch (error) {
      console.error('Error loading sent emails:', error);
    }
  };

  const loadDrafts = async () => {
    if (!publicKey || !signMessage) return;

    try {
      const response = await callSecureEndpoint(
        'get_drafts',
        {},
        publicKey,
        signMessage
      );
      setDrafts(response.drafts || []);
    } catch (error) {
      console.error('Error loading drafts:', error);
    }
  };

  const handleDisconnect = () => {
    disconnect();
    navigate('/');
  };

  const toggleStar = async (emailId: string, currentStarred: boolean) => {
    try {
      // Optimistic update
      setEmails(prev => 
        prev.map(e => e.id === emailId ? { ...e, starred: !currentStarred } : e)
      );
      setSentEmails(prev => 
        prev.map(e => e.id === emailId ? { ...e, starred: !currentStarred } : e)
      );

      const response = await supabase.functions.invoke('toggle-star', {
        body: { emailId, starred: !currentStarred }
      });

      if (response.error) {
        throw response.error;
      }

      toast({
        title: !currentStarred ? 'Starred' : 'Unstarred',
        description: !currentStarred ? 'Email added to starred' : 'Email removed from starred',
      });
    } catch (error) {
      console.error('Error toggling star:', error);
      // Revert on error
      setEmails(prev => 
        prev.map(e => e.id === emailId ? { ...e, starred: currentStarred } : e)
      );
      setSentEmails(prev => 
        prev.map(e => e.id === emailId ? { ...e, starred: currentStarred } : e)
      );
      toast({
        title: 'Error',
        description: 'Failed to update star',
        variant: 'destructive',
      });
    }
  };

  const handleBulkDelete = async () => {
    if (!publicKey || !signMessage) return;

    setDeleting(true);
    try {
      if (activeTab === 'drafts') {
        const deletePromises = Array.from(selectedEmails).map(draftId =>
          callSecureEndpoint(
            'delete_draft',
            { draftId },
            publicKey,
            signMessage
          )
        );
        
        await Promise.all(deletePromises);
        setDrafts(prev => prev.filter(d => !selectedEmails.has(d.id)));
      } else {
        const deletePromises = Array.from(selectedEmails).map(emailId =>
          callSecureEndpoint(
            'delete_email',
            { emailId },
            publicKey,
            signMessage
          )
        );
        
        await Promise.all(deletePromises);
        setEmails(prev => prev.filter(e => !selectedEmails.has(e.id)));
        setSentEmails(prev => prev.filter(e => !selectedEmails.has(e.id)));
      }
      
      setSelectedEmails(new Set());
      
      toast({
        title: 'Deleted',
        description: `${selectedEmails.size} item${selectedEmails.size === 1 ? '' : 's'} deleted successfully`,
      });
    } catch (error) {
      console.error('Error deleting:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete some items',
        variant: 'destructive',
      });
    } finally {
      setDeleting(false);
      setShowBulkDeleteDialog(false);
    }
  };

  const handleRefresh = () => {
    setLoading(true);
    loadEmails();
    loadSentEmails();
    loadDrafts();
  };

  const handleCompose = () => {
    const newWindow: ComposeWindow = {
      id: Math.random().toString(36).substring(7),
      draftId: null,
      subject: '',
      isMinimized: false,
    };
    setComposeWindows(prev => [...prev, newWindow]);
    setActiveWindowId(newWindow.id);
  };

  const handleOpenDraft = (draftId: string) => {
    const newWindow: ComposeWindow = {
      id: Math.random().toString(36).substring(7),
      draftId,
      subject: '',
      isMinimized: false,
    };
    setComposeWindows(prev => [...prev, newWindow]);
    setActiveWindowId(newWindow.id);
  };

  const handleCloseWindow = (windowId: string) => {
    setComposeWindows(prev => prev.filter(w => w.id !== windowId));
    if (activeWindowId === windowId) {
      const remaining = composeWindows.filter(w => w.id !== windowId);
      setActiveWindowId(remaining.length > 0 ? remaining[0].id : null);
    }
  };

  const handleWindowClick = (windowId: string) => {
    setActiveWindowId(windowId);
    setComposeWindows(prev =>
      prev.map(w => (w.id === windowId ? { ...w, isMinimized: false } : w))
    );
  };

  const handleSubjectChange = (windowId: string, subject: string) => {
    setComposeWindows(prev =>
      prev.map(w => (w.id === windowId ? { ...w, subject } : w))
    );
  };

  const unreadCount = useMemo(() => {
    return emails.filter(e => !e.read).length;
  }, [emails]);

  const starredCount = useMemo(() => {
    return emails.filter(e => e.starred).length;
  }, [emails]);

  // Filter and group emails
  const { importantEmails, starredEmails, regularEmails } = useMemo(() => {
    let filtered = [...emails];

    // Search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter(email => 
        email.from_wallet.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (activeTab === 'starred') {
      return {
        importantEmails: [],
        starredEmails: filtered.filter(e => e.starred),
        regularEmails: []
      };
    }

    if (activeTab === 'inbox') {
      return {
        importantEmails: filtered.filter(e => !e.read),
        starredEmails: filtered.filter(e => e.starred && e.read),
        regularEmails: filtered.filter(e => e.read && !e.starred)
      };
    }

    return { importantEmails: [], starredEmails: [], regularEmails: filtered };
  }, [emails, searchQuery, activeTab]);

  const filteredSentEmails = useMemo(() => {
    let filtered = [...sentEmails];

    if (searchQuery.trim()) {
      filtered = filtered.filter(email => 
        email.to_wallet.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return filtered;
  }, [sentEmails, searchQuery]);

  const filteredDrafts = useMemo(() => {
    let filtered = [...drafts];

    if (searchQuery.trim()) {
      filtered = filtered.filter(draft => 
        draft.to_wallet?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return filtered;
  }, [drafts, searchQuery]);

  const handleSelectAll = () => {
    if (activeTab === 'inbox' || activeTab === 'starred') {
      const allEmails = activeTab === 'starred' ? starredEmails : [...importantEmails, ...starredEmails, ...regularEmails];
      if (selectedEmails.size === allEmails.length) {
        setSelectedEmails(new Set());
      } else {
        setSelectedEmails(new Set(allEmails.map(e => e.id)));
      }
    } else if (activeTab === 'sent') {
      if (selectedEmails.size === filteredSentEmails.length) {
        setSelectedEmails(new Set());
      } else {
        setSelectedEmails(new Set(filteredSentEmails.map(e => e.id)));
      }
    } else if (activeTab === 'drafts') {
      if (selectedEmails.size === filteredDrafts.length) {
        setSelectedEmails(new Set());
      } else {
        setSelectedEmails(new Set(filteredDrafts.map(d => d.id)));
      }
    }
  };

  const renderEmailList = (emailList: EncryptedEmail[], isSent: boolean = false) => {
    if (emailList.length === 0) return null;

    return emailList.map((email) => (
      <EmailRow
        key={email.id}
        id={email.id}
        sender={isSent ? email.to_wallet : email.from_wallet}
        subject="Encrypted Message"
        preview="Click to decrypt and read"
        timestamp={email.timestamp}
        read={email.read}
        starred={email.starred}
        encrypted={true}
        paid={!!email.payment_tx_signature}
        selected={selectedEmails.has(email.id)}
        onSelect={(checked) => {
          const newSelection = new Set(selectedEmails);
          if (checked) {
            newSelection.add(email.id);
          } else {
            newSelection.delete(email.id);
          }
          setSelectedEmails(newSelection);
        }}
        onStarToggle={() => toggleStar(email.id, email.starred)}
        onClick={() => setSelectedEmailId(email.id)}
      />
    ));
  };

  const renderDraftList = () => {
    if (filteredDrafts.length === 0) return null;

    return filteredDrafts.map((draft) => (
      <div
        key={draft.id}
        className="gmail-email-row"
        onClick={() => handleOpenDraft(draft.id)}
      >
        <div className="flex items-center gap-3 px-4 py-3">
          <Checkbox
            checked={selectedEmails.has(draft.id)}
            onCheckedChange={(checked) => {
              const newSelection = new Set(selectedEmails);
              if (checked) {
                newSelection.add(draft.id);
              } else {
                newSelection.delete(draft.id);
              }
              setSelectedEmails(newSelection);
            }}
            onClick={(e) => e.stopPropagation()}
          />
          <div className="w-48 flex-shrink-0 truncate text-sm text-muted-foreground">
            {draft.to_wallet ? `${draft.to_wallet.slice(0, 8)}...${draft.to_wallet.slice(-8)}` : 'No recipient'}
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-sm text-muted-foreground">Draft — Click to continue editing</span>
          </div>
          <div className="w-24 flex-shrink-0 text-right text-xs text-muted-foreground">
            {new Date(draft.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </div>
        </div>
      </div>
    ));
  };

  const totalEmails = activeTab === 'inbox' ? emails.length : 
                      activeTab === 'sent' ? sentEmails.length : 
                      activeTab === 'drafts' ? drafts.length :
                      starredEmails.length;

  return (
    <div className="min-h-screen bg-background flex w-full">
      <GmailSidebar
        className={selectedEmailId ? "hidden md:flex" : ""}
        unreadCount={unreadCount}
        sentCount={sentEmails.length}
        draftsCount={drafts.length}
        starredCount={starredCount}
        onDisconnect={handleDisconnect}
        onCompose={handleCompose}
      />

      {!selectedEmailId ? (
        <main className="flex-1 flex flex-col min-w-0">
        {/* Missing Key Banner */}
        {showKeyBanner && (
          <div className="bg-yellow-500/10 border-b border-yellow-500/20 px-4 py-3">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 flex-1">
                <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">Private decryption key not found on this device</p>
                  <p className="text-xs text-muted-foreground">Import your key to read encrypted messages</p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Button 
                  size="sm" 
                  variant="default" 
                  onClick={() => openKeyManagement()}
                  className="gap-2"
                >
                  <Key className="w-4 h-4" />
                  Restore Key
                </Button>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  onClick={() => setShowKeyBanner(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
        
        {/* Header */}
        <header className="border-b border-border bg-background sticky top-0 z-10">
          <div className="px-4 md:px-6 py-3 flex items-center gap-4">
            {/* Search Bar */}
            <div className="flex-1 max-w-3xl relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="Search emails..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-10 h-12 bg-muted/30"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Social Links - Hidden on mobile to prevent crowding */}
            <SocialLinks className="hidden sm:flex" />

            {/* Refresh Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleRefresh}
              disabled={loading}
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </header>

        {/* Toolbar */}
        <div className="border-b border-border px-4 py-2 flex items-center gap-3 bg-background">
          <Checkbox
            checked={selectedEmails.size > 0}
            onCheckedChange={handleSelectAll}
          />
          {selectedEmails.size > 0 && (
            <>
              <span className="text-sm text-muted-foreground">
                {selectedEmails.size} selected
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowBulkDeleteDialog(true)}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
            </>
          )}
        </div>

        {/* Email List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-12 h-12 animate-spin text-primary" />
            </div>
          ) : totalEmails === 0 ? (
            <div className="text-center py-20">
              <p className="text-xl text-muted-foreground">
                {activeTab === 'inbox' && 'No messages in inbox'}
                {activeTab === 'sent' && 'No sent messages'}
                {activeTab === 'drafts' && 'No drafts'}
                {activeTab === 'starred' && 'No starred messages'}
              </p>
            </div>
          ) : (
            <>
              {activeTab === 'inbox' && (
                <>
                  {importantEmails.length > 0 && (
                    <>
                      <SectionHeader
                        title="Important and unread"
                        count={importantEmails.length}
                        expanded={importantExpanded}
                        onToggle={() => setImportantExpanded(!importantExpanded)}
                      />
                      {importantExpanded && renderEmailList(importantEmails)}
                    </>
                  )}
                  
                  {starredEmails.length > 0 && (
                    <>
                      <SectionHeader
                        title="Starred"
                        count={starredEmails.length}
                        expanded={starredExpanded}
                        onToggle={() => setStarredExpanded(!starredExpanded)}
                      />
                      {starredExpanded && renderEmailList(starredEmails)}
                    </>
                  )}
                  
                  {regularEmails.length > 0 && (
                    <>
                      <SectionHeader
                        title="Everything else"
                        count={regularEmails.length}
                        expanded={allExpanded}
                        onToggle={() => setAllExpanded(!allExpanded)}
                      />
                      {allExpanded && renderEmailList(regularEmails)}
                    </>
                  )}
                </>
              )}

              {activeTab === 'starred' && renderEmailList(starredEmails)}
              {activeTab === 'sent' && renderEmailList(filteredSentEmails, true)}
              {activeTab === 'drafts' && renderDraftList()}
            </>
          )}
        </div>
      </main>
      ) : (
        <main className="flex-1 flex flex-col">
          <InlineEmailViewer
            emailId={selectedEmailId}
            onClose={() => setSelectedEmailId(null)}
            onDelete={() => {
              setSelectedEmailId(null);
              loadEmails();
              loadSentEmails();
            }}
          />
        </main>
      )}

      {/* Delete Confirmation */}
      <ConfirmDeleteDialog
        open={showBulkDeleteDialog}
        onOpenChange={setShowBulkDeleteDialog}
        onConfirm={handleBulkDelete}
        title={`Delete ${selectedEmails.size} item${selectedEmails.size === 1 ? '' : 's'}?`}
        description={`This will permanently delete ${selectedEmails.size} item${selectedEmails.size === 1 ? '' : 's'}. This action cannot be undone.`}
      />

      {/* Compose Windows */}
      {composeWindows.map(window => (
        <ComposeModal
          key={window.id}
          isOpen={!window.isMinimized}
          onClose={() => handleCloseWindow(window.id)}
          draftId={window.draftId}
          onSent={() => {
            handleCloseWindow(window.id);
            loadEmails();
            loadSentEmails();
            loadDrafts();
          }}
          onSubjectChange={(subject) => handleSubjectChange(window.id, subject)}
        />
      ))}

      {/* Tab Switcher */}
      <ComposeTabSwitcher
        windows={composeWindows}
        activeWindowId={activeWindowId || ''}
        onWindowClick={handleWindowClick}
        onWindowClose={handleCloseWindow}
      />
    </div>
  );
};

export default Inbox;
