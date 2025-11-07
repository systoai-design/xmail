import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, Trash2, Edit, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { callSecureEndpoint } from '@/lib/secureApi';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';

export default function Scheduled() {
  const { publicKey, signMessage, connected } = useWallet();
  const navigate = useNavigate();
  const [scheduledEmails, setScheduledEmails] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (connected && publicKey && signMessage) {
      loadScheduledEmails();
    }
  }, [connected, publicKey, signMessage]);

  const loadScheduledEmails = async () => {
    if (!publicKey || !signMessage) return;

    try {
      setLoading(true);
      const response = await callSecureEndpoint(
        'get_scheduled_emails',
        {},
        publicKey,
        signMessage
      );
      setScheduledEmails(response.scheduledEmails || []);
    } catch (error) {
      console.error('Failed to load scheduled emails:', error);
      toast({
        title: "Load Failed",
        description: "Failed to load scheduled emails",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const cancelEmail = async (scheduledId: string) => {
    if (!publicKey || !signMessage) return;

    try {
      await callSecureEndpoint(
        'cancel_scheduled_email',
        { scheduledId },
        publicKey,
        signMessage
      );

      setScheduledEmails(prev => prev.filter(e => e.id !== scheduledId));

      toast({
        title: "Email Cancelled",
        description: "Scheduled email has been cancelled",
      });
    } catch (error) {
      console.error('Failed to cancel email:', error);
      toast({
        title: "Cancel Failed",
        description: "Failed to cancel scheduled email",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="gap-1"><Clock className="w-3 h-3" />Pending</Badge>;
      case 'sent':
        return <Badge variant="default" className="gap-1"><CheckCircle2 className="w-3 h-3" />Sent</Badge>;
      case 'failed':
        return <Badge variant="destructive" className="gap-1"><AlertCircle className="w-3 h-3" />Failed</Badge>;
      case 'cancelled':
        return <Badge variant="secondary">Cancelled</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getTimeUntilSend = (scheduledFor: string) => {
    const now = new Date();
    const scheduled = new Date(scheduledFor);
    const diff = scheduled.getTime() - now.getTime();

    if (diff < 0) return 'Sending soon...';

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `In ${days} day${days > 1 ? 's' : ''}`;
    }

    if (hours > 0) {
      return `In ${hours}h ${minutes}m`;
    }

    return `In ${minutes} minute${minutes !== 1 ? 's' : ''}`;
  };

  if (!connected) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background via-background to-primary/5 flex items-center justify-center p-4">
        <Card className="p-8 text-center">
          <h2 className="text-2xl font-bold mb-4">Connect Your Wallet</h2>
          <p className="text-muted-foreground">Please connect your wallet to view scheduled emails</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-primary/5">
      {/* Header */}
      <div className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/inbox')}
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold">Scheduled Emails</h1>
                <p className="text-sm text-muted-foreground">
                  Manage your scheduled messages
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <p className="mt-4 text-muted-foreground">Loading scheduled emails...</p>
          </div>
        ) : scheduledEmails.length === 0 ? (
          <Card className="p-12 text-center">
            <Clock className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-xl font-semibold mb-2">No Scheduled Emails</h3>
            <p className="text-muted-foreground mb-6">
              You don't have any scheduled emails yet
            </p>
            <Button onClick={() => navigate('/compose')}>
              Compose New Email
            </Button>
          </Card>
        ) : (
          <div className="space-y-4">
            {scheduledEmails.map((email) => (
              <Card key={email.id} className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      {getStatusBadge(email.status)}
                      {email.status === 'pending' && (
                        <span className="text-sm text-muted-foreground">
                          {getTimeUntilSend(email.scheduled_for)}
                        </span>
                      )}
                    </div>
                    
                    <p className="text-sm font-medium mb-1">
                      To: {email.to_wallet.slice(0, 8)}...{email.to_wallet.slice(-6)}
                    </p>
                    
                    <p className="text-sm text-muted-foreground mb-3">
                      Scheduled for: {format(new Date(email.scheduled_for), 'PPP p')}
                    </p>

                    {email.error_message && (
                      <p className="text-sm text-destructive">
                        Error: {email.error_message}
                      </p>
                    )}
                  </div>

                  {email.status === 'pending' && (
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => cancelEmail(email.id)}
                        title="Cancel"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
