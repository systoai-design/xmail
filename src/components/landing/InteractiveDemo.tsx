import { useEffect, useRef, useState } from 'react';
import { Lock, Unlock, Mail, Zap, Shield, Check } from 'lucide-react';
import { Logo } from '@/components/Logo';

export const InteractiveDemo = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [animatingIndex, setAnimatingIndex] = useState<number | null>(null);

  const demoMessages = [
    {
      from: "8kR7...mN4p",
      subject: "Welcome to xmail",
      timestamp: "2 min ago",
      paid: true
    },
    {
      from: "3xT9...pL2k",
      subject: "Meeting notes",
      timestamp: "5 min ago",
      paid: true
    },
    {
      from: "9mP4...qW7s",
      subject: "Project update",
      timestamp: "12 min ago",
      paid: false
    }
  ];

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.2 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // Animation loop
  useEffect(() => {
    if (!isVisible) return;

    let currentIndex = 0;
    const interval = setInterval(() => {
      if (currentIndex < demoMessages.length) {
        setAnimatingIndex(currentIndex);
        
        // Show encryption animation
        setTimeout(() => {
          setMessages(prev => [...prev, { ...demoMessages[currentIndex], encrypted: false }]);
          
          // Complete encryption after delay
          setTimeout(() => {
            setMessages(prev => 
              prev.map((msg, idx) => 
                idx === currentIndex ? { ...msg, encrypted: true } : msg
              )
            );
            setAnimatingIndex(null);
          }, 1500);
        }, 500);
        
        currentIndex++;
      } else {
        // Reset after showing all messages
        setTimeout(() => {
          setMessages([]);
          currentIndex = 0;
        }, 3000);
      }
    }, 3500);

    return () => clearInterval(interval);
  }, [isVisible]);

  return (
    <section ref={sectionRef} className="bg-background py-16 sm:py-20 md:py-24 px-4 sm:px-6 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: 'radial-gradient(circle at 30% 50%, hsl(267 100% 35%) 0px, transparent 50%), radial-gradient(circle at 70% 50%, hsl(187 100% 35%) 0px, transparent 50%)',
        }} />
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        <div className={`grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center fade-in-up ${isVisible ? 'visible' : ''}`}>
          
          {/* Inbox Mockup */}
          <div className="order-2 lg:order-1">
            <div className="glass-glow rounded-3xl p-6 sm:p-8 border border-border/50">
              {/* Mockup Header */}
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-border/50">
                <Logo size="small" />
                <div className="text-xs text-muted-foreground font-mono bg-muted/20 px-3 py-1.5 rounded-full">
                  9mP4...qW7s
                </div>
              </div>

              {/* Mockup Content */}
              <div className="space-y-3">
                {messages.length === 0 && animatingIndex === null && (
                  <div className="text-center py-12 text-muted-foreground">
                    <Mail className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">Waiting for messages...</p>
                  </div>
                )}

                {messages.map((message, index) => (
                  <div
                    key={index}
                    className="glass p-4 rounded-xl border border-border/50 hover:border-primary/40 transition-all cursor-pointer animate-slide-in-top"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center ${!message.encrypted ? 'animate-lock-pulse' : ''}`}>
                          {message.encrypted ? (
                            <Lock className="w-4 h-4 text-primary" />
                          ) : (
                            <Unlock className="w-4 h-4 text-secondary animate-pulse" />
                          )}
                        </div>
                        <div>
                          <div className="text-xs font-mono text-muted-foreground">
                            {message.from}
                          </div>
                          <div className="text-xs text-muted-foreground/70">
                            {message.timestamp}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {message.paid && (
                          <div className="text-[10px] bg-accent/20 text-accent px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                            <Check className="w-3 h-3" />
                            Paid
                          </div>
                        )}
                      </div>
                    </div>

                    {!message.encrypted ? (
                      <div className="space-y-2">
                        <div className="text-sm font-semibold text-secondary">
                          Encrypting...
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-primary to-secondary animate-progress-fill" />
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="text-sm font-semibold mb-1 flex items-center gap-2">
                          <Lock className="w-3 h-3" />
                          Encrypted Message
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Click to decrypt and read
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Description Panel */}
          <div className="order-1 lg:order-2 space-y-8">
            <div className="inline-flex items-center gap-2 glass-card px-4 py-2 rounded-full">
              <Zap className="w-4 h-4 text-accent" />
              <span className="text-xs uppercase tracking-wider font-bold text-accent">
                See it in action
              </span>
            </div>

            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold leading-tight">
              Experience
              <br />
              <span className="gradient-primary bg-clip-text text-transparent">
                True Privacy
              </span>
            </h2>

            <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
              Watch how xmail encrypts messages in real-time. Each message is secured with military-grade encryption before it hits the blockchain.
            </p>

            <div className="space-y-5">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl glass-card flex items-center justify-center flex-shrink-0">
                  <Shield className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <div className="font-semibold mb-1.5">Real-time encryption</div>
                  <div className="text-sm text-muted-foreground">
                    Messages encrypted before transmission
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl glass-card flex items-center justify-center flex-shrink-0">
                  <Zap className="w-5 h-5 text-secondary" />
                </div>
                <div>
                  <div className="font-semibold mb-1.5">Instant delivery via Solana</div>
                  <div className="text-sm text-muted-foreground">
                    Lightning-fast blockchain transactions
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl glass-card flex items-center justify-center flex-shrink-0">
                  <Lock className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <div className="font-semibold mb-1.5">Your keys, your data</div>
                  <div className="text-sm text-muted-foreground">
                    No intermediary servers or third parties
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
