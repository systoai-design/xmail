import { useEffect, useState } from 'react';
import { Lock, ArrowRight, Shield } from 'lucide-react';

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

  const getScrambledText = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
    return plainText
      .split("")
      .map(() => chars[Math.floor(Math.random() * chars.length)])
      .join("");
  };

  return (
    <div className="hidden md:block absolute bottom-44 left-1/2 -translate-x-1/2 w-full max-w-4xl px-4 opacity-40 hover:opacity-70 transition-opacity duration-500 pointer-events-none">
      <div className="flex items-center justify-center gap-6 lg:gap-10">
        {/* Plain Text Box */}
        <div 
          className={`relative glass-card px-5 py-4 lg:px-7 lg:py-5 rounded-2xl border-2 transition-all duration-500 ${
            stage === 0 ? 'border-primary/60 shadow-glow scale-105' : 'border-border/20 scale-100'
          }`}
        >
          <div className="text-[10px] lg:text-xs text-muted-foreground uppercase tracking-widest mb-2 font-bold flex items-center gap-2">
            <Shield className="w-3 h-3" />
            Plain Text
          </div>
          <div className="font-mono text-sm lg:text-base text-foreground font-semibold">
            {stage < 2 ? plainText : getScrambledText()}
          </div>
        </div>

        {/* Lock Icon with Animation */}
        <div className="relative flex items-center gap-2 lg:gap-3">
          <div 
            className={`p-3 lg:p-4 rounded-2xl bg-primary/20 border-2 border-primary/30 transition-all duration-500 ${
              stage === 1 || stage === 2 ? 'rotate-[360deg] scale-125 shadow-glow border-primary/60' : 'rotate-0 scale-100'
            }`}
          >
            <Lock className="w-5 h-5 lg:w-6 lg:h-6 text-primary" />
          </div>
          
          {/* Arrow */}
          <ArrowRight 
            className={`w-6 h-6 lg:w-7 lg:h-7 text-primary/50 transition-all duration-500 ${
              stage === 3 ? 'translate-x-3 opacity-100 scale-110' : 'translate-x-0 opacity-30 scale-100'
            }`}
          />
        </div>

        {/* Encrypted Box */}
        <div 
          className={`relative glass-card px-5 py-4 lg:px-7 lg:py-5 rounded-2xl border-2 transition-all duration-500 ${
            stage >= 2 ? 'border-secondary/60 shadow-glow-cyan scale-105' : 'border-border/20 scale-100'
          }`}
        >
          <div className="text-[10px] lg:text-xs text-muted-foreground uppercase tracking-widest mb-2 font-bold flex items-center gap-2">
            <Lock className="w-3 h-3" />
            Encrypted
          </div>
          <div className="font-mono text-sm lg:text-base text-secondary font-semibold">
            {stage >= 2 ? encryptedText : '············'}
          </div>
        </div>
      </div>

      {/* Status Text */}
      <div className="text-center mt-5 lg:mt-6 text-xs lg:text-sm text-muted-foreground font-semibold">
        {stage === 0 && "📝 Original message"}
        {stage === 1 && "🔒 Encrypting with AES-256-GCM..."}
        {stage === 2 && "✅ Message encrypted"}
        {stage === 3 && "🚀 Secure transmission"}
      </div>
    </div>
  );
};
