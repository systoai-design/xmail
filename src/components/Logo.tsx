import { useState, useEffect, useRef } from 'react';
import { Lock } from 'lucide-react';
import logoImage from '@/assets/xmail-logo.png';

interface LogoProps {
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

const sizeMap = {
  small: 'w-[120px]',
  medium: 'w-[180px]',
  large: 'w-[240px]',
};

const iconSizeMap = {
  small: 'w-4 h-4 sm:w-5 sm:h-5',
  medium: 'w-5 h-5 sm:w-6 sm:h-6',
  large: 'w-6 h-6 sm:w-7 sm:h-7',
};

const textSizeMap = {
  small: 'text-base sm:text-xl',
  medium: 'text-xl sm:text-2xl',
  large: 'text-2xl sm:text-3xl md:text-4xl',
};

export const Logo = ({ size = 'medium', className = '' }: LogoProps) => {
  const [isRevealed, setIsRevealed] = useState(false);
  const touchTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hideTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hasMoveRef = useRef(false);

  useEffect(() => {
    return () => {
      if (touchTimerRef.current) clearTimeout(touchTimerRef.current);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, []);

  const handleMouseEnter = () => {
    setIsRevealed(true);
  };

  const handleMouseLeave = () => {
    setIsRevealed(false);
  };

  const handleTouchStart = () => {
    hasMoveRef.current = false;
    touchTimerRef.current = setTimeout(() => {
      if (!hasMoveRef.current) {
        setIsRevealed(true);
        // Hide after 2 seconds on mobile
        hideTimerRef.current = setTimeout(() => {
          setIsRevealed(false);
        }, 2000);
      }
    }, 500);
  };

  const handleTouchMove = () => {
    hasMoveRef.current = true;
    if (touchTimerRef.current) {
      clearTimeout(touchTimerRef.current);
      touchTimerRef.current = null;
    }
  };

  const handleTouchEnd = () => {
    if (touchTimerRef.current) {
      clearTimeout(touchTimerRef.current);
      touchTimerRef.current = null;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setIsRevealed(!isRevealed);
    }
  };

  return (
    <div
      className={`relative inline-block cursor-pointer ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-label="xmail logo - hover or tap and hold to reveal"
    >
      {/* Default state: Lock icon + "xmail" text */}
      <div
        className={`flex items-center gap-1.5 sm:gap-2 transition-all duration-300 ${
          isRevealed ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
        }`}
      >
        <Lock className={`${iconSizeMap[size]} text-primary animate-pulse`} />
        <span className={`${textSizeMap[size]} font-black gradient-primary bg-clip-text text-transparent`}>
          xmail
        </span>
      </div>

      {/* Revealed state: Full logo */}
      <div
        className={`absolute inset-0 flex items-center transition-all duration-300 ${
          isRevealed ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'
        }`}
      >
        <img
          src={logoImage}
          alt="xmail logo"
          className={`${sizeMap[size]} h-auto object-contain`}
        />
      </div>
    </div>
  );
};
