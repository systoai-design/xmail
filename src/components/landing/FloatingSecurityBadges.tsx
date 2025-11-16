import { useEffect, useState } from 'react';
import { Shield, Lock, Zap, Activity } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export const FloatingSecurityBadges = () => {
  const [stats, setStats] = useState({
    tps: 0,
    messagesSent: 0,
  });

  useEffect(() => {
    // Simulate live TPS counter
    const tpsInterval = setInterval(() => {
      setStats(prev => ({
        ...prev,
        tps: Math.floor(2000 + Math.random() * 1500), // Solana typical TPS
      }));
    }, 2000);

    // Simulate messages sent counter
    const messagesInterval = setInterval(() => {
      setStats(prev => ({
        ...prev,
        messagesSent: prev.messagesSent + Math.floor(Math.random() * 5 + 1),
      }));
    }, 3000);

    return () => {
      clearInterval(tpsInterval);
      clearInterval(messagesInterval);
    };
  }, []);

  return (
    <>
      {/* AES-256-GCM Badge - Top Left */}
      <div className="absolute top-20 left-[5%] lg:left-[10%] floating-badge" style={{ animationDelay: '0s' }}>
        <div className="glass-card px-6 py-4 rounded-2xl border-2 border-primary/40 shadow-glow-primary backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Lock className="w-6 h-6 text-primary animate-lock-pulse" />
              <div className="absolute inset-0 animate-ping-slow opacity-30">
                <Lock className="w-6 h-6 text-primary" />
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground font-semibold">Encryption</div>
              <div className="text-sm font-bold text-foreground">AES-256-GCM</div>
            </div>
          </div>
        </div>
      </div>

      {/* Solana Verification Badge - Top Right */}
      <div className="absolute top-32 right-[5%] lg:right-[10%] floating-badge" style={{ animationDelay: '0.5s' }}>
        <div className="glass-card px-6 py-4 rounded-2xl border-2 border-success/40 shadow-glow-success backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Shield className="w-6 h-6 text-success animate-lock-pulse" />
              <div className="absolute inset-0 animate-ping-slow opacity-30">
                <Shield className="w-6 h-6 text-success" />
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground font-semibold">Blockchain</div>
              <div className="text-sm font-bold text-foreground">Solana Verified</div>
            </div>
          </div>
        </div>
      </div>

      {/* Live TPS Badge - Middle Left */}
      <div className="absolute top-[45%] left-[3%] lg:left-[8%] floating-badge" style={{ animationDelay: '1s' }}>
        <div className="glass-card px-5 py-3 rounded-2xl border-2 border-accent/40 shadow-glow-accent backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Zap className="w-5 h-5 text-accent animate-pulse" />
              <div className="absolute inset-0 animate-ping-slow opacity-30">
                <Zap className="w-5 h-5 text-accent" />
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground font-semibold">Network TPS</div>
              <div className="text-lg font-bold text-foreground tabular-nums">
                {stats.tps.toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Messages Sent Badge - Middle Right */}
      <div className="absolute top-[50%] right-[3%] lg:right-[8%] floating-badge" style={{ animationDelay: '1.5s' }}>
        <div className="glass-card px-5 py-3 rounded-2xl border-2 border-primary/40 shadow-glow-primary backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Activity className="w-5 h-5 text-primary animate-pulse" />
              <div className="absolute inset-0 animate-ping-slow opacity-30">
                <Activity className="w-5 h-5 text-primary" />
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground font-semibold">Messages Today</div>
              <div className="text-lg font-bold text-foreground tabular-nums">
                {stats.messagesSent.toLocaleString()}+
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Security Level Badge - Bottom Center (Hidden on mobile) */}
      <div className="hidden lg:block absolute bottom-24 left-1/2 -translate-x-1/2 floating-badge" style={{ animationDelay: '2s' }}>
        <div className="glass-card px-8 py-3 rounded-full border-2 border-success/40 shadow-glow-success backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-success" />
              <Shield className="w-4 h-4 text-success" />
              <Shield className="w-3 h-3 text-success" />
            </div>
            <div className="text-sm font-bold text-foreground">
              Military-Grade Security
            </div>
            <Badge variant="outline" className="bg-success/20 border-success/50 text-success text-xs">
              Active
            </Badge>
          </div>
        </div>
      </div>
    </>
  );
};
