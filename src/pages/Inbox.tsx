import { useWallet } from '@solana/wallet-adapter-react';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState, useMemo } from 'react';
import { Mail, Lock, Plus, LogOut, Loader2, Search, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useEncryptionKeys } from '@/hooks/useEncryptionKeys';
import { callSecureEndpoint } from '@/lib/secureApi';

interface EncryptedEmail {
  id: string;
  from_wallet: string;
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
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [readFilter, setReadFilter] = useState<'all' | 'read' | 'unread'>('all');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');

  useEffect(() => {
    if (!connected) {
      navigate('/');
      return;
    }
    if (keysReady) {
      loadEmails();
    }
  }, [connected, navigate, publicKey, keysReady]);

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

  const handleDisconnect = () => {
    disconnect();
    navigate('/');
  };

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const filteredEmails = useMemo(() => {
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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="glass border-b border-border sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-4xl font-black gradient-primary bg-clip-text text-transparent">
              xmail
            </h1>
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
        <div className="mb-8">
          <h2 className="text-5xl font-black mb-2">Inbox</h2>
          <p className="text-xl text-muted-foreground">
            {filteredEmails.length} of {emails.length} encrypted {emails.length === 1 ? 'message' : 'messages'}
          </p>
        </div>

        {/* Search and Filters */}
        {emails.length > 0 && (
          <div className="mb-6 glass p-4 rounded-xl">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by wallet address..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Read Filter */}
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

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-12 h-12 animate-spin text-primary" />
          </div>
        ) : filteredEmails.length === 0 && emails.length === 0 ? (
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
        ) : filteredEmails.length === 0 ? (
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
            {filteredEmails.map((email) => (
              <div
                key={email.id}
                onClick={() => navigate(`/email/${email.id}`)}
                className="glass p-6 rounded-xl hover:scale-[1.02] transition-smooth cursor-pointer"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                      <Mail className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <div className="font-mono text-sm text-muted-foreground">
                        From: {email.from_wallet.slice(0, 8)}...{email.from_wallet.slice(-8)}
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
                  Click to decrypt and read
                </p>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Inbox;
