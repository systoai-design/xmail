import { useWallet } from '@solana/wallet-adapter-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useEffect, useState, useMemo } from 'react';
import { Mail, Lock, Plus, LogOut, Loader2, Search, Filter, Send, Inbox as InboxIcon, Trash2, FileEdit, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useEncryptionKeys } from '@/hooks/useEncryptionKeys';
import { callSecureEndpoint } from '@/lib/secureApi';
import { supabase } from '@/integrations/supabase/client';
import { ConfirmDeleteDialog } from '@/components/ConfirmDeleteDialog';
import { Logo } from '@/components/Logo';
import { KeyManagement } from '@/components/KeyManagement';
import { KeyRotationBanner } from '@/components/KeyRotationBanner';

interface EncryptedEmail {
  id: string;
  from_wallet: string;
  to_wallet: string;
  encrypted_subject: string;
  encrypted_body: string;
  timestamp: string;
  read: boolean;
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
  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromUrl = searchParams.get('tab') || 'inbox';
  
  const [emails, setEmails] = useState<EncryptedEmail[]>([]);
  const [sentEmails, setSentEmails] = useState<EncryptedEmail[]>([]);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [readFilter, setReadFilter] = useState<'all' | 'read' | 'unread'>('all');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [activeTab, setActiveTab] = useState<'inbox' | 'sent' | 'drafts'>(tabFromUrl as any);
  const [selectedEmails, setSelectedEmails] = useState<Set<string>>(new Set());
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');

  // Update URL when tab changes
  useEffect(() => {
    setSearchParams({ tab: activeTab });
  }, [activeTab, setSearchParams]);

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
    if (keysReady) {
      loadEmails();
      loadSentEmails();
      loadDrafts();
    }
  }, [connected, navigate, publicKey, keysReady]);

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
      toast({
        title: 'Error',
        description: 'Failed to load sent emails',
        variant: 'destructive',
      });
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
      toast({
        title: 'Error',
        description: 'Failed to load drafts',
        variant: 'destructive',
      });
    }
  };

  const handleDisconnect = () => {
    disconnect();
    navigate('/');
  };

  const handleBulkDelete = async () => {
    if (!publicKey || !signMessage) return;

    setDeleting(true);
    try {
      if (activeTab === 'drafts') {
        // Delete drafts
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
        // Delete emails
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
        title: `${activeTab === 'drafts' ? 'Drafts' : 'Emails'} deleted`,
        description: `${selectedEmails.size} ${activeTab === 'drafts' ? 'draft' : 'email'}${selectedEmails.size === 1 ? '' : 's'} deleted successfully`,
      });
    } catch (error) {
      console.error('Error deleting:', error);
      toast({
        title: 'Error',
        description: `Failed to delete some ${activeTab === 'drafts' ? 'drafts' : 'emails'}`,
        variant: 'destructive',
      });
    } finally {
      setDeleting(false);
      setShowBulkDeleteDialog(false);
    }
  };

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const unreadCount = useMemo(() => {
    return emails.filter(e => !e.read).length;
  }, [emails]);

  const filteredInboxEmails = useMemo(() => {
    let filtered = [...emails];

    // Search by wallet address
    if (searchQuery.trim()) {
      filtered = filtered.filter(email => 
        email.from_wallet.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter by read/unread status
    if (readFilter === 'read') {
      filtered = filtered.filter(email => email.read);
    } else if (readFilter === 'unread') {
      filtered = filtered.filter(email => !email.read);
    }

    // Sort by date
    filtered.sort((a, b) => {
      const dateA = new Date(a.timestamp).getTime();
      const dateB = new Date(b.timestamp).getTime();
      return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
    });

    return filtered;
  }, [emails, searchQuery, readFilter, sortOrder]);

  const filteredSentEmails = useMemo(() => {
    let filtered = [...sentEmails];

    // Search by recipient wallet address
    if (searchQuery.trim()) {
      filtered = filtered.filter(email => 
        email.to_wallet.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Sort by date
    filtered.sort((a, b) => {
      const dateA = new Date(a.timestamp).getTime();
      const dateB = new Date(b.timestamp).getTime();
      return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
    });

    return filtered;
  }, [sentEmails, searchQuery, sortOrder]);

  const filteredDrafts = useMemo(() => {
    let filtered = [...drafts];

    // Search by recipient
    if (searchQuery.trim()) {
      filtered = filtered.filter(draft => 
        draft.to_wallet?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Sort by date
    filtered.sort((a, b) => {
      const dateA = new Date(a.updated_at).getTime();
      const dateB = new Date(b.updated_at).getTime();
      return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
    });

    return filtered;
  }, [drafts, searchQuery, sortOrder]);

  const currentItems = activeTab === 'inbox' ? filteredInboxEmails : activeTab === 'sent' ? filteredSentEmails : filteredDrafts;
  const totalItems = activeTab === 'inbox' ? emails.length : activeTab === 'sent' ? sentEmails.length : drafts.length;

  const renderEmailCard = (email: EncryptedEmail, isSent: boolean) => (
    <div
      key={email.id}
      className="glass p-4 md:p-6 rounded-xl hover:scale-[1.02] transition-smooth flex items-center gap-3 md:gap-4"
    >
      <Checkbox
        checked={selectedEmails.has(email.id)}
        onCheckedChange={(checked) => {
          const newSelection = new Set(selectedEmails);
          if (checked) {
            newSelection.add(email.id);
          } else {
            newSelection.delete(email.id);
          }
          setSelectedEmails(newSelection);
        }}
        onClick={(e) => e.stopPropagation()}
      />
      <div
        onClick={() => navigate(`/email/${email.id}`)}
        className="flex-1 cursor-pointer min-w-0"
      >
        <div className="flex items-start justify-between mb-2 md:mb-3 gap-2">
          <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
            <div className={`w-10 h-10 md:w-12 md:h-12 rounded-full ${isSent ? 'bg-secondary/20' : 'bg-primary/20'} flex items-center justify-center flex-shrink-0`}>
              {isSent ? <Send className="w-4 h-4 md:w-6 md:h-6 text-secondary" /> : <Mail className="w-4 h-4 md:w-6 md:h-6 text-primary" />}
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-mono text-xs md:text-sm text-muted-foreground truncate">
                {isSent ? 'To:' : 'From:'} {(isSent ? email.to_wallet : email.from_wallet).slice(0, 6)}...{(isSent ? email.to_wallet : email.from_wallet).slice(-6)}
              </div>
              <div className="text-xs md:text-sm text-muted-foreground">
                {formatDate(email.timestamp)}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 md:gap-2 flex-shrink-0">
            {!isSent && !email.read && (
              <Badge variant="default" className="bg-accent text-xs">New</Badge>
            )}
            {email.payment_tx_signature && (
              <div className="text-xs bg-accent/20 text-accent px-2 py-1 rounded-full font-bold">
                ✓
              </div>
            )}
            <Lock className="w-4 h-4 md:w-5 md:h-5 text-primary" />
          </div>
        </div>
        <div className="text-lg md:text-2xl font-bold mb-1 md:mb-2 flex items-center gap-2">
          <Lock className="w-4 h-4 md:w-5 md:h-5" />
          Encrypted Message
        </div>
        <p className="text-sm md:text-base text-muted-foreground">
          Click to {isSent ? 'view sent message' : 'decrypt and read'}
        </p>
      </div>
    </div>
  );

  const renderDraftCard = (draft: Draft) => (
    <div
      key={draft.id}
      className="glass p-4 md:p-6 rounded-xl hover:scale-[1.02] transition-smooth flex items-center gap-3 md:gap-4"
    >
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
      <div
        onClick={() => navigate(`/compose?draft=${draft.id}`)}
        className="flex-1 cursor-pointer min-w-0"
      >
        <div className="flex items-start justify-between mb-2 md:mb-3 gap-2">
          <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-muted/20 flex items-center justify-center flex-shrink-0">
              <FileEdit className="w-4 h-4 md:w-6 md:h-6 text-muted-foreground" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-mono text-xs md:text-sm text-muted-foreground truncate">
                {draft.to_wallet ? `To: ${draft.to_wallet.slice(0, 6)}...${draft.to_wallet.slice(-6)}` : 'No recipient'}
              </div>
              <div className="text-xs md:text-sm text-muted-foreground">
                Updated {formatDate(draft.updated_at)}
              </div>
            </div>
          </div>
          <Badge variant="outline" className="text-xs flex-shrink-0">Draft</Badge>
        </div>
        <div className="text-lg md:text-2xl font-bold mb-1 md:mb-2 flex items-center gap-2">
          <FileEdit className="w-4 h-4 md:w-5 md:h-5" />
          Draft Message
        </div>
        <p className="text-sm md:text-base text-muted-foreground">
          Click to continue editing
        </p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="glass border-b border-border sticky top-0 z-50">
        <div className="container mx-auto px-4 md:px-6 py-3 md:py-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 md:gap-4 min-w-0">
            <Logo size="medium" />
            {publicKey && (
              <div className="text-xs md:text-sm text-muted-foreground font-mono truncate">
                {publicKey.toBase58().slice(0, 4)}...{publicKey.toBase58().slice(-4)}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 md:gap-4 flex-shrink-0">
            <KeyManagement />
            <Button
              onClick={() => navigate('/compose')}
              size="default"
              className="font-bold shadow-glow"
            >
              <Plus className="w-4 h-4 md:mr-2" />
              <span className="hidden md:inline">New Email</span>
            </Button>
            <Button
              onClick={handleDisconnect}
              variant="outline"
              size="default"
            >
              <LogOut className="w-4 h-4 md:mr-2" />
              <span className="hidden md:inline">Disconnect</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 md:px-6 py-6 md:py-8">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'inbox' | 'sent' | 'drafts')} className="w-full">
          <div className="mb-6 md:mb-8">
            <h2 className="text-3xl md:text-5xl font-black mb-4">Messages</h2>
            <TabsList className="grid w-full md:max-w-2xl grid-cols-3">
              <TabsTrigger value="inbox" className="flex items-center gap-2 text-xs md:text-sm">
                <InboxIcon className="w-4 h-4" />
                <span className="hidden sm:inline">Inbox</span>
                {unreadCount > 0 && (
                  <Badge variant="default" className="ml-1 bg-accent text-xs">
                    {unreadCount}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="sent" className="flex items-center gap-2 text-xs md:text-sm">
                <Send className="w-4 h-4" />
                <span className="hidden sm:inline">Sent</span> ({sentEmails.length})
              </TabsTrigger>
              <TabsTrigger value="drafts" className="flex items-center gap-2 text-xs md:text-sm">
                <FileEdit className="w-4 h-4" />
                <span className="hidden sm:inline">Drafts</span> ({drafts.length})
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Search and Filters */}
          {totalItems > 0 && (
            <div className="mb-6 glass p-4 rounded-xl">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Search */}
                <div className="relative md:col-span-2">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder={`Search by ${activeTab === 'inbox' ? 'sender' : activeTab === 'sent' ? 'recipient' : 'recipient'} address...`}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 pr-10"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Read Filter - only for inbox */}
                {activeTab === 'inbox' ? (
                  <div className="flex gap-2">
                    <Button
                      variant={readFilter === 'all' ? 'default' : 'outline'}
                      onClick={() => setReadFilter('all')}
                      className="flex-1"
                    >
                      All
                    </Button>
                    <Button
                      variant={readFilter === 'unread' ? 'default' : 'outline'}
                      onClick={() => setReadFilter('unread')}
                      className="flex-1"
                    >
                      Unread
                      {unreadCount > 0 && (
                        <Badge variant="secondary" className="ml-2">
                          {unreadCount}
                        </Badge>
                      )}
                    </Button>
                    <Button
                      variant={readFilter === 'read' ? 'default' : 'outline'}
                      onClick={() => setReadFilter('read')}
                      className="flex-1"
                    >
                      Read
                    </Button>
                  </div>
                ) : (
                  <Select value={sortOrder} onValueChange={(value: any) => setSortOrder(value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sort by date" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="newest">Newest First</SelectItem>
                      <SelectItem value="oldest">Oldest First</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>
          )}

          <TabsContent value="inbox">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-12 h-12 animate-spin text-primary" />
              </div>
            ) : filteredInboxEmails.length === 0 && emails.length === 0 ? (
              <div className="text-center py-12 md:py-20">
                <Mail className="w-16 h-16 md:w-24 md:h-24 text-muted-foreground mx-auto mb-4 md:mb-6" />
                <h3 className="text-2xl md:text-3xl font-bold mb-2">No messages yet</h3>
                <p className="text-base md:text-xl text-muted-foreground mb-6 md:mb-8">
                  Send your first encrypted email to get started
                </p>
                <Button
                  onClick={() => navigate('/compose')}
                  size="lg"
                  className="font-bold shadow-glow"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Compose Email
                </Button>
              </div>
            ) : filteredInboxEmails.length === 0 ? (
              <div className="text-center py-12 md:py-20">
                <Filter className="w-16 h-16 md:w-24 md:h-24 text-muted-foreground mx-auto mb-4 md:mb-6" />
                <h3 className="text-2xl md:text-3xl font-bold mb-2">No messages match your filters</h3>
                <p className="text-base md:text-xl text-muted-foreground mb-6 md:mb-8">
                  Try adjusting your search or filter criteria
                </p>
                <Button
                  onClick={() => {
                    setSearchQuery('');
                    setReadFilter('all');
                  }}
                  variant="outline"
                  size="lg"
                >
                  Clear Filters
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredInboxEmails.map((email) => renderEmailCard(email, false))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="sent">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-12 h-12 animate-spin text-primary" />
              </div>
            ) : filteredSentEmails.length === 0 && sentEmails.length === 0 ? (
              <div className="text-center py-12 md:py-20">
                <Send className="w-16 h-16 md:w-24 md:h-24 text-muted-foreground mx-auto mb-4 md:mb-6" />
                <h3 className="text-2xl md:text-3xl font-bold mb-2">No sent messages</h3>
                <p className="text-base md:text-xl text-muted-foreground mb-6 md:mb-8">
                  Send your first encrypted email to see it here
                </p>
                <Button
                  onClick={() => navigate('/compose')}
                  size="lg"
                  className="font-bold shadow-glow"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Compose Email
                </Button>
              </div>
            ) : filteredSentEmails.length === 0 ? (
              <div className="text-center py-12 md:py-20">
                <Filter className="w-16 h-16 md:w-24 md:h-24 text-muted-foreground mx-auto mb-4 md:mb-6" />
                <h3 className="text-2xl md:text-3xl font-bold mb-2">No messages match your search</h3>
                <p className="text-base md:text-xl text-muted-foreground mb-6 md:mb-8">
                  Try adjusting your search criteria
                </p>
                <Button
                  onClick={() => setSearchQuery('')}
                  variant="outline"
                  size="lg"
                >
                  Clear Search
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredSentEmails.map((email) => renderEmailCard(email, true))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="drafts">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-12 h-12 animate-spin text-primary" />
              </div>
            ) : filteredDrafts.length === 0 && drafts.length === 0 ? (
              <div className="text-center py-12 md:py-20">
                <FileEdit className="w-16 h-16 md:w-24 md:h-24 text-muted-foreground mx-auto mb-4 md:mb-6" />
                <h3 className="text-2xl md:text-3xl font-bold mb-2">No drafts</h3>
                <p className="text-base md:text-xl text-muted-foreground mb-6 md:mb-8">
                  Start composing a message and it will be saved automatically
                </p>
                <Button
                  onClick={() => navigate('/compose')}
                  size="lg"
                  className="font-bold shadow-glow"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Compose Email
                </Button>
              </div>
            ) : filteredDrafts.length === 0 ? (
              <div className="text-center py-12 md:py-20">
                <Filter className="w-16 h-16 md:w-24 md:h-24 text-muted-foreground mx-auto mb-4 md:mb-6" />
                <h3 className="text-2xl md:text-3xl font-bold mb-2">No drafts match your search</h3>
                <p className="text-base md:text-xl text-muted-foreground mb-6 md:mb-8">
                  Try adjusting your search criteria
                </p>
                <Button
                  onClick={() => setSearchQuery('')}
                  variant="outline"
                  size="lg"
                >
                  Clear Search
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredDrafts.map((draft) => renderDraftCard(draft))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* Bulk Action Toolbar */}
      {selectedEmails.size > 0 && (
        <div className="fixed bottom-4 md:bottom-8 left-4 right-4 md:left-1/2 md:right-auto md:-translate-x-1/2 glass-glow p-4 md:p-6 rounded-2xl shadow-2xl border-2 border-primary/30 z-50">
          <div className="flex flex-col sm:flex-row items-center gap-3 md:gap-6">
            <div className="text-sm md:text-lg font-bold text-center sm:text-left">
              {selectedEmails.size} {activeTab === 'drafts' ? 'draft' : 'email'}{selectedEmails.size === 1 ? '' : 's'} selected
            </div>
            <div className="flex gap-2 md:gap-3 w-full sm:w-auto">
              <Button
                onClick={() => setShowBulkDeleteDialog(true)}
                variant="destructive"
                size="default"
                className="flex-1 sm:flex-none"
              >
                <Trash2 className="w-4 h-4 md:mr-2" />
                <span className="hidden md:inline">Delete Selected</span>
                <span className="md:hidden">Delete</span>
              </Button>
              <Button
                onClick={() => setSelectedEmails(new Set())}
                variant="outline"
                size="default"
                className="flex-1 sm:flex-none"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Confirmation */}
      <ConfirmDeleteDialog
        open={showBulkDeleteDialog}
        onOpenChange={setShowBulkDeleteDialog}
        onConfirm={handleBulkDelete}
        title={`Delete ${selectedEmails.size} ${activeTab === 'drafts' ? 'draft' : 'email'}${selectedEmails.size === 1 ? '' : 's'}?`}
        description={`This will permanently delete ${selectedEmails.size} ${activeTab === 'drafts' ? 'draft' : 'email'}${selectedEmails.size === 1 ? '' : 's'}. This action cannot be undone.`}
      />
    </div>
  );
};

export default Inbox;