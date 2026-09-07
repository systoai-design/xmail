import { useWallet } from '@/hooks/useWallet';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useEffect, useState, useMemo } from 'react';
import { Search, Loader2, X, RefreshCw, Trash2, Key, AlertCircle, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { useEncryptionKeys } from '@/hooks/useEncryptionKeys';
import { useParkedOutbox } from '@/hooks/useParkedOutbox';
import { callSecureEndpoint } from '@/lib/secureApi';
import { supabase } from '@/integrations/supabase/client';
import { ConfirmDeleteDialog } from '@/components/ConfirmDeleteDialog';
import { GmailSidebar } from '@/components/GmailSidebar';
import { EmailRow } from '@/components/EmailRow';
import { EmptyState } from '@/components/EmptyState';
import { SectionHeader } from '@/components/SectionHeader';
import { ComposeModal } from '@/components/ComposeModal';
import { ComposeTabSwitcher, ComposeWindow } from '@/components/ComposeTabSwitcher';
import { InlineEmailViewer } from '@/components/InlineEmailViewer';
import { ParkedList } from '@/components/ParkedList';
import { UnanchoredNotice } from '@/components/UnanchoredNotice';
import { MessageListSkeleton } from '@/components/MessageListSkeleton';
import { cn } from '@/lib/utils';
import { openKeyManagement, onKeyImported, onMailChanged } from '@/lib/events';

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
  const { connected, address, disconnect, signMessage } = useWallet();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { keysReady, needsUnlock, unlocking, unlock } = useEncryptionKeys();
  const [searchParams] = useSearchParams();
  // Flushes on load: parked mail is delivered when the sender next opens xmail.
  const { parkedCount, flush: flushParked } = useParkedOutbox(() => {
    loadSentEmails();
  });
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
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Check for missing key and show banner
  useEffect(() => {
    if (keysReady && connected && address) {
      const hasPrivateKey = !!localStorage.getItem('encryption_private_key');
      setShowKeyBanner(!hasPrivateKey);
    }
  }, [keysReady, connected, address]);

  // Listen for key imports to hide banner
  useEffect(() => {
    return onKeyImported(() => {
      setShowKeyBanner(false);
    });
  }, []);

  const activeTab = tabFromUrl as 'inbox' | 'sent' | 'drafts' | 'starred' | 'parked';

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
    
    // This used to poll `while (!keysReady)` for ten seconds. `keysReady` is
    // captured from the render that created the effect and was not in the deps,
    // so the loop re-read the same stale `false` twenty times and then gave up
    // for good -- and the effect never re-ran when the keys actually arrived.
    // Signing out and back in landed here with keys still unlocking, so inbox,
    // sent and drafts all stayed permanently empty.
    //
    // React already has the mechanism: depend on the value and let the effect
    // re-run when it changes.
    if (!keysReady) {
      // Keys are still being set up, or waiting to be unlocked. Only the second
      // of those is a finished state -- the first is still loading, and calling
      // it finished rendered "Nothing here yet" over a mailbox that had mail in
      // it, for as long as key setup took.
      //
      // No toast either way: if a signature is needed the banner below asks for
      // it, and a toast cannot be clicked to provide the gesture a wallet
      // requires.
      if (needsUnlock) setLoading(false);
      return;
    }

    loadEmails();
    loadSentEmails();
    loadDrafts();
  }, [connected, keysReady, navigate, address]);

  // Set up Realtime listener for new emails
  useEffect(() => {
    if (!connected || !address || !keysReady) return;

    console.log('Setting up realtime listener for:', address);

    const channel = supabase
      .channel('inbox-updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'encrypted_emails',
          filter: `to_wallet=eq.${address}`
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
  }, [connected, address, keysReady, notificationPermission, toast]);

  const loadEmails = async () => {
    if (!address || !signMessage) return;

    try {
      const response = await callSecureEndpoint(
        'get_inbox',
        {},
        address,
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
    if (!address || !signMessage) return;

    try {
      const response = await callSecureEndpoint(
        'get_sent',
        {},
        address,
        signMessage
      );
      setSentEmails(response.emails || []);
    } catch (error) {
      console.error('Error loading sent emails:', error);
      toast({
        title: 'Could not load sent mail',
        description: 'Reload to try again.',
        variant: 'destructive',
      });
    }
  };

  const loadDrafts = async () => {
    if (!address || !signMessage) return;

    try {
      const response = await callSecureEndpoint(
        'get_drafts',
        {},
        address,
        signMessage
      );
      setDrafts(response.drafts || []);
    } catch (error) {
      // Swallowing this made a failed fetch look exactly like an empty folder,
      // which is how "my drafts disappeared" reads to someone whose drafts are
      // sitting safely in the database.
      console.error('Error loading drafts:', error);
      toast({
        title: 'Could not load drafts',
        description: 'They are still saved. Reload to try again.',
        variant: 'destructive',
      });
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

      // Was the unauthenticated toggle-star function. Now goes through
      // secure-email, which verifies the wallet and scopes the update to
      // emails this wallet is party to.
      const response = await callSecureEndpoint(
        'toggle_star',
        { emailId, starred: !currentStarred },
        address,
        signMessage
      );

      if (response?.error) {
        throw new Error(response.error);
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
    if (!address || !signMessage) return;

    setDeleting(true);
    try {
      if (activeTab === 'drafts') {
        const deletePromises = Array.from(selectedEmails).map(draftId =>
          callSecureEndpoint(
            'delete_draft',
            { draftId },
            address,
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
            address,
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

  const openCompose = (init: Partial<ComposeWindow>) => {
    const newWindow: ComposeWindow = {
      id: crypto.randomUUID(),
      draftId: null,
      subject: init.initialSubject ?? '',
      isMinimized: false,
      ...init,
    };
    setComposeWindows(prev => [...prev, newWindow]);
    setActiveWindowId(newWindow.id);
  };

  const handleReply = (toWallet: string, subject?: string) =>
    openCompose({
      initialTo: toWallet,
      initialSubject: subject ? (/^re:/i.test(subject) ? subject : `Re: ${subject}`) : '',
    });

  // Forward carries the original across, quoted, the way every mail client
  // does -- an empty composer would make the reader retype what they are
  // forwarding.
  const handleForward = (subject: string, body: string, from: string, when: string) =>
    openCompose({
      initialSubject: /^fwd:/i.test(subject) ? subject : `Fwd: ${subject}`,
      initialBody:
        `<br/><br/><div style="border-left:2px solid rgba(255,255,255,.2);padding-left:12px;color:#9A968E">` +
        `<div>---------- Forwarded message ----------</div>` +
        `<div>From: ${from}</div><div>Date: ${when}</div><div>Subject: ${subject}</div>` +
        `<br/>${body}</div>`,
    });

  // Any send, undo, delete or parked delivery re-reads the folders, so the
  // lists never disagree with what just happened.
  useEffect(() => onMailChanged(() => {
    loadEmails();
    loadSentEmails();
    loadDrafts();
  }), []);

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
    // The composer saves a draft on its way out, so the folder that is supposed
    // to hold it has to be re-read. Without this a saved draft stayed invisible
    // until a manual reload, which looks exactly like a save that failed.
    loadDrafts();
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
    <div className="min-h-screen bg-background flex w-full relative">
      <GmailSidebar
        className={selectedEmailId ? "hidden md:flex" : ""}
        unreadCount={unreadCount}
        sentCount={sentEmails.length}
        draftsCount={drafts.length}
        starredCount={starredCount}
        parkedCount={parkedCount}
        onDisconnect={handleDisconnect}
        onCompose={handleCompose}
        mobileOpen={mobileSidebarOpen}
        onMobileOpenChange={setMobileSidebarOpen}
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
            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileSidebarOpen(true)}
              className="md:hidden flex-shrink-0"
            >
              <Menu className="w-5 h-5" />
            </Button>

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

        {/* Selection bar. Only exists when there is something to select --
            otherwise it renders as a lone checkbox floating over an empty list. */}
        {totalEmails > 0 && (
        <div className="flex items-center gap-3 border-b border-border bg-background px-4 py-2">
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
        )}

        {needsUnlock && (
          <div className="mx-4 mt-4 rounded-xl border border-white/10 bg-card p-4 sm:mx-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold">Unlock your encryption</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Your key is stored encrypted. Approve one wallet signature to
                  decrypt it on this device.
                </p>
              </div>
              <Button onClick={unlock} disabled={unlocking} size="sm" className="shrink-0">
                {unlocking ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Waiting for signature
                  </>
                ) : (
                  'Unlock encryption'
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Email List */}
        {/* Mail sent before anchoring became a precondition can still be
            unanchored. Nothing surfaced that, so it was only discoverable by
            opening each message one at a time. */}
        <UnanchoredNotice />

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <MessageListSkeleton />
          ) : totalEmails === 0 ? (
            <EmptyState tab={activeTab} onCompose={handleCompose} />
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
              {activeTab === 'parked' && <ParkedList onFlush={() => void flushParked()} />}
            </>
          )}
        </div>
      </main>
      ) : (
        <main className="flex-1 flex flex-col">
          <InlineEmailViewer
            emailId={selectedEmailId}
            onClose={() => setSelectedEmailId(null)}
            onReply={handleReply}
            onForward={handleForward}
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
          initialTo={window.initialTo}
          initialSubject={window.initialSubject}
          initialBody={window.initialBody}
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
