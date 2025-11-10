import { useEffect, useState } from 'react';
import { Lock, ArrowRight } from 'lucide-react';

export const EncryptionAnimation = () => {
  const [stage, setStage] = useState(0);
  
  const plainText = "Hello, World!";
  const encryptedText = "xN9#kL@2vQ$7";
  
  useEffect(() => {
    const interval = setInterval(() => {
      setStage((prev) => (prev + 1) % 4);
    }, 2000);
    
    return () => clearInterval(interval);
  }, []);

  const getScrambledText = (progress: number) => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
    return plainText
      .split("")
      .map(() => chars[Math.floor(Math.random() * chars.length)])
      .join("");
  };

  return (
    <div className="absolute bottom-20 left-1/2 -translate-x-1/2 w-full max-w-4xl px-4 opacity-30 hover:opacity-60 transition-opacity duration-500">
      <div className="flex items-center justify-center gap-4 sm:gap-8">
        {/* Plain Text Box */}
        <div 
          className={`relative glass-card px-6 py-4 rounded-xl border transition-all duration-500 ${
            stage === 0 ? 'border-primary/50 shadow-glow' : 'border-border/30'
          }`}
        >
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">
            Plain Text
          </div>
          <div className="font-mono text-sm text-foreground">
            {stage < 2 ? plainText : getScrambledText(stage)}
          </div>
        </div>

        {/* Lock Icon with Animation */}
        <div className="relative flex items-center gap-2">
          <div 
            className={`p-3 rounded-full bg-primary/20 border border-primary/30 transition-all duration-500 ${
              stage === 1 || stage === 2 ? 'rotate-[360deg] scale-110 shadow-glow' : 'rotate-0'
            }`}
          >
            <Lock className="w-5 h-5 text-primary" />
          </div>
          
          {/* Arrow */}
          <ArrowRight 
            className={`w-6 h-6 text-primary/50 transition-all duration-500 ${
              stage === 3 ? 'translate-x-2 opacity-100' : 'translate-x-0 opacity-30'
            }`}
          />
        </div>

        {/* Encrypted Box */}
        <div 
          className={`relative glass-card px-6 py-4 rounded-xl border transition-all duration-500 ${
            stage >= 2 ? 'border-secondary/50 shadow-glow-cyan' : 'border-border/30'
          }`}
        >
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">
            Encrypted
          </div>
          <div className="font-mono text-sm text-secondary">
            {stage >= 2 ? encryptedText : '············'}
          </div>
        </div>
      </div>

      {/* Status Text */}
      <div className="text-center mt-4 text-xs text-muted-foreground font-medium">
        {stage === 0 && "Original message"}
        {stage === 1 && "Encrypting with AES-256-GCM..."}
        {stage === 2 && "Message encrypted"}
        {stage === 3 && "Secure transmission"}
      </div>
    </div>
  );
};
