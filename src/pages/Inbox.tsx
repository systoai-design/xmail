import { useWallet } from '@solana/wallet-adapter-react';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState, useMemo } from 'react';
import { Mail, Lock, Plus, LogOut, Loader2, Search, Filter, Send, Inbox as InboxIcon, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { useEncryptionKeys } from '@/hooks/useEncryptionKeys';
import { callSecureEndpoint } from '@/lib/secureApi';
import { supabase } from '@/integrations/supabase/client';
import { ConfirmDeleteDialog } from '@/components/ConfirmDeleteDialog';
import { Logo } from '@/components/Logo';

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

const Inbox = () => {
  const { connected, publicKey, disconnect, signMessage } = useWallet();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { keysReady } = useEncryptionKeys();
  const [emails, setEmails] = useState<EncryptedEmail[]>([]);
  const [sentEmails, setSentEmails] = useState<EncryptedEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [readFilter, setReadFilter] = useState<'all' | 'read' | 'unread'>('all');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [activeTab, setActiveTab] = useState<'inbox' | 'sent'>('inbox');
  const [selectedEmails, setSelectedEmails] = useState<Set<string>>(new Set());
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');

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

  const handleDisconnect = () => {
    disconnect();
    navigate('/');
  };

  const handleBulkDelete = async () => {
    if (!publicKey || !signMessage) return;

    setDeleting(true);
    try {
      // Delete all selected emails
      const deletePromises = Array.from(selectedEmails).map(emailId =>
        callSecureEndpoint(
          'delete_email',
          { emailId },
          publicKey,
          signMessage
        )
      );
      
      await Promise.all(deletePromises);
      
      // Remove from local state
      setEmails(prev => prev.filter(e => !selectedEmails.has(e.id)));
      setSentEmails(prev => prev.filter(e => !selectedEmails.has(e.id)));
      setSelectedEmails(new Set());
      
      toast({
        title: 'Emails deleted',
        description: `${deletePromises.length} ${deletePromises.length === 1 ? 'email' : 'emails'} deleted successfully`,
      });
    } catch (error) {
      console.error('Error deleting emails:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete some emails',
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

  const currentEmails = activeTab === 'inbox' ? filteredInboxEmails : filteredSentEmails;
  const totalEmails = activeTab === 'inbox' ? emails.length : sentEmails.length;

  const renderEmailCard = (email: EncryptedEmail, isSent: boolean) => (
    <div
      key={email.id}
      className="glass p-6 rounded-xl hover:scale-[1.02] transition-smooth flex items-center gap-4"
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
        className="flex-1 cursor-pointer"
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-full ${isSent ? 'bg-secondary/20' : 'bg-primary/20'} flex items-center justify-center`}>
              {isSent ? <Send className="w-6 h-6 text-secondary" /> : <Mail className="w-6 h-6 text-primary" />}
            </div>
            <div>
              <div className="font-mono text-sm text-muted-foreground">
                {isSent ? 'To:' : 'From:'} {(isSent ? email.to_wallet : email.from_wallet).slice(0, 8)}...{(isSent ? email.to_wallet : email.from_wallet).slice(-8)}
              </div>
              <div className="text-sm text-muted-foreground">
                {formatDate(email.timestamp)}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {email.payment_tx_signature && (
              <div className="text-xs bg-accent/20 text-accent px-3 py-1 rounded-full font-bold">
                ✓ Paid
              </div>
            )}
            <Lock className="w-5 h-5 text-primary" />
          </div>
        </div>
        <div className="text-2xl font-bold mb-2 flex items-center gap-2">
          <Lock className="w-5 h-5" />
          Encrypted Message
        </div>
        <p className="text-muted-foreground">
          Click to {isSent ? 'view sent message' : 'decrypt and read'}
        </p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="glass border-b border-border sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Logo size="medium" />
            {publicKey && (
              <div className="text-sm text-muted-foreground font-mono">
                {publicKey.toBase58().slice(0, 6)}...{publicKey.toBase58().slice(-6)}
              </div>
            )}
          </div>
          <div className="flex items-center gap-4">
            <Button
              onClick={() => navigate('/compose')}
              size="lg"
              className="font-bold text-lg shadow-glow"
            >
              <Plus className="w-5 h-5 mr-2" />
              New Email
            </Button>
            <Button
              onClick={handleDisconnect}
              variant="outline"
              size="lg"
            >
              <LogOut className="w-5 h-5 mr-2" />
              Disconnect
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'inbox' | 'sent')} className="w-full">
          <div className="mb-8">
            <h2 className="text-5xl font-black mb-4">Messages</h2>
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="inbox" className="flex items-center gap-2">
                <InboxIcon className="w-4 h-4" />
                Inbox ({emails.length})
              </TabsTrigger>
              <TabsTrigger value="sent" className="flex items-center gap-2">
                <Send className="w-4 h-4" />
                Sent ({sentEmails.length})
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Search and Filters */}
          {totalEmails > 0 && (
            <div className="mb-6 glass p-4 rounded-xl">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder={`Search by ${activeTab === 'inbox' ? 'sender' : 'recipient'} address...`}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {/* Read Filter - only for inbox */}
                {activeTab === 'inbox' && (
                  <Select value={readFilter} onValueChange={(value: any) => setReadFilter(value)}>
                    <SelectTrigger>
                      <Filter className="w-4 h-4 mr-2" />
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Messages</SelectItem>
                      <SelectItem value="unread">Unread</SelectItem>
                      <SelectItem value="read">Read</SelectItem>
                    </SelectContent>
                  </Select>
                )}

                {/* Sort */}
                <Select value={sortOrder} onValueChange={(value: any) => setSortOrder(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sort by date" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Newest First</SelectItem>
                    <SelectItem value="oldest">Oldest First</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <TabsContent value="inbox">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-12 h-12 animate-spin text-primary" />
              </div>
            ) : filteredInboxEmails.length === 0 && emails.length === 0 ? (
              <div className="text-center py-20">
                <Mail className="w-24 h-24 text-muted-foreground mx-auto mb-6" />
                <h3 className="text-3xl font-bold mb-2">No messages yet</h3>
                <p className="text-xl text-muted-foreground mb-8">
                  Send your first encrypted email to get started
                </p>
                <Button
                  onClick={() => navigate('/compose')}
                  size="lg"
                  className="font-bold text-lg shadow-glow"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Compose Email
                </Button>
              </div>
            ) : filteredInboxEmails.length === 0 ? (
              <div className="text-center py-20">
                <Filter className="w-24 h-24 text-muted-foreground mx-auto mb-6" />
                <h3 className="text-3xl font-bold mb-2">No messages match your filters</h3>
                <p className="text-xl text-muted-foreground mb-8">
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
              <div className="text-center py-20">
                <Send className="w-24 h-24 text-muted-foreground mx-auto mb-6" />
                <h3 className="text-3xl font-bold mb-2">No sent messages</h3>
                <p className="text-xl text-muted-foreground mb-8">
                  Send your first encrypted email to see it here
                </p>
                <Button
                  onClick={() => navigate('/compose')}
                  size="lg"
                  className="font-bold text-lg shadow-glow"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Compose Email
                </Button>
              </div>
            ) : filteredSentEmails.length === 0 ? (
              <div className="text-center py-20">
                <Filter className="w-24 h-24 text-muted-foreground mx-auto mb-6" />
                <h3 className="text-3xl font-bold mb-2">No messages match your search</h3>
                <p className="text-xl text-muted-foreground mb-8">
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
        </Tabs>
      </main>

      {/* Bulk Action Toolbar */}
      {selectedEmails.size > 0 && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 glass px-6 py-4 rounded-full shadow-glow flex items-center gap-4 z-50 border border-border">
          <span className="font-bold">
            {selectedEmails.size} selected
          </span>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setShowBulkDeleteDialog(true)}
            disabled={deleting}
          >
            {deleting ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4 mr-2" />
            )}
            Delete Selected
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedEmails(new Set())}
          >
            Clear
          </Button>
        </div>
      )}

      {/* Bulk Delete Confirmation Dialog */}
      <ConfirmDeleteDialog
        open={showBulkDeleteDialog}
        onOpenChange={setShowBulkDeleteDialog}
        onConfirm={handleBulkDelete}
        title={`Delete ${selectedEmails.size} ${selectedEmails.size === 1 ? 'email' : 'emails'}?`}
        description="This will permanently delete the selected emails. This action cannot be undone."
      />
    </div>
  );
};

export default Inbox;
