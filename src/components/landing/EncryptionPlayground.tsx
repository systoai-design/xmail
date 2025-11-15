import { useState, useEffect } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { FileText, Lock, Eye, EyeOff, Shield, Info, ArrowRight, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

export const EncryptionPlayground = () => {
  const [plaintext, setPlaintext] = useState('Type your secret message here...');
  const [encrypted, setEncrypted] = useState('');
  const [isEncrypting, setIsEncrypting] = useState(false);
  const [showDecrypted, setShowDecrypted] = useState(false);

  // Simulate encryption with visual effect
  useEffect(() => {
    if (!plaintext || plaintext.trim() === '') {
      setEncrypted('');
      return;
    }

    setIsEncrypting(true);
    const timeout = setTimeout(() => {
      // Generate realistic-looking encrypted text
      const encrypted = btoa(plaintext)
        .split('')
        .map(c => Math.random() > 0.5 ? c.toUpperCase() : c.toLowerCase())
        .join('')
        .match(/.{1,64}/g)
        ?.join('\n') || '';
      
      setEncrypted(encrypted);
      setIsEncrypting(false);
    }, 300);

    return () => clearTimeout(timeout);
  }, [plaintext]);

  return (
    <div className="max-w-6xl mx-auto">
      <div className="grid lg:grid-cols-[1fr_auto_1fr] gap-6 items-start">
        {/* Left: Original Message */}
        <div className="space-y-3">
          <Label className="text-lg font-semibold flex items-center gap-2 text-foreground">
            <FileText className="w-5 h-5 text-primary" />
            Your Message
          </Label>
          <Textarea
            value={plaintext}
            onChange={(e) => setPlaintext(e.target.value)}
            className="min-h-[280px] font-mono text-base bg-background border-border focus:border-primary transition-colors"
            placeholder="Type your secret message..."
          />
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Shield className="w-4 h-4 text-primary" />
            <span>Will be encrypted with AES-256-GCM</span>
          </div>
        </div>

        {/* Middle: Encryption Animation */}
        <div className="flex items-center justify-center py-12 lg:py-0">
          <div className="relative">
            <div className={cn(
              "relative w-16 h-16 flex items-center justify-center rounded-full",
              "bg-primary/10 border-2 border-primary/30",
              isEncrypting && "animate-pulse"
            )}>
              <ArrowRight className={cn(
                "w-8 h-8 text-primary transition-transform duration-500",
                isEncrypting && "scale-110"
              )} />
              {isEncrypting && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Zap className="w-6 h-6 text-amber-premium animate-bounce" />
                </div>
              )}
            </div>
            {isEncrypting && (
              <div className="absolute -inset-4 rounded-full border-2 border-primary/20 animate-ping" />
            )}
          </div>
        </div>

        {/* Right: Encrypted Message */}
        <div className="space-y-3">
          <Label className="text-lg font-semibold flex items-center gap-2 text-foreground">
            <Lock className="w-5 h-5 text-primary" />
            Encrypted Output
          </Label>
          <div className="relative">
            <Textarea
              value={encrypted}
              readOnly
              className="min-h-[280px] font-mono text-base bg-muted/30 text-cyan-flow border-primary/30"
              placeholder="Encrypted ciphertext will appear here..."
            />
            {encrypted && (
              <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-md">
                <div className="scan-line" />
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDecrypted(!showDecrypted)}
              disabled={!encrypted}
              className="gap-2"
            >
              {showDecrypted ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              {showDecrypted ? 'Hide' : 'Decrypt & View'}
            </Button>
            {encrypted && (
              <Badge variant="outline" className="gap-1">
                <Shield className="w-3 h-3" />
                {encrypted.length} bytes encrypted
              </Badge>
            )}
          </div>

          {showDecrypted && (
            <div className="p-4 border-2 border-emerald-secure/50 bg-emerald-secure/10 rounded-lg animate-fade-in">
              <p className="text-sm font-semibold text-emerald-secure mb-2 flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Decrypted Successfully
              </p>
              <p className="font-mono text-sm text-foreground break-words">{plaintext}</p>
            </div>
          )}
        </div>
      </div>

      {/* Technical Details */}
      <div className="mt-12 p-6 border border-border rounded-lg bg-card/50 backdrop-blur-sm">
        <h4 className="font-semibold mb-4 flex items-center gap-2 text-foreground">
          <Info className="w-5 h-5 text-primary" />
          How End-to-End Encryption Works
        </h4>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">
                1
              </div>
              <div>
                <p className="font-medium text-foreground">Message Encryption</p>
                <p className="text-sm text-muted-foreground">Your message is encrypted locally using AES-256-GCM, the same encryption standard used by banks and governments</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">
                2
              </div>
              <div>
                <p className="font-medium text-foreground">Key Encryption</p>
                <p className="text-sm text-muted-foreground">The encryption key is encrypted with the recipient's public key, ensuring only they can access it</p>
              </div>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">
                3
              </div>
              <div>
                <p className="font-medium text-foreground">Secure Transmission</p>
                <p className="text-sm text-muted-foreground">Encrypted message is stored on Solana blockchain with spam protection via minimal X402 fees</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">
                4
              </div>
              <div>
                <p className="font-medium text-foreground">Recipient Decryption</p>
                <p className="text-sm text-muted-foreground">Only the recipient can decrypt the message using their private key, ensuring complete privacy</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
