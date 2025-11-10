import { Lock } from 'lucide-react';

interface LogoProps {
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

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
  return (
    <div
      className={`inline-flex items-center gap-1.5 sm:gap-2 group ${className}`}
      role="img"
      aria-label="xmail logo"
    >
      <div className="relative">
        <Lock 
          className={`${iconSizeMap[size]} text-primary transition-all duration-300 group-hover:scale-110`}
          style={{
            filter: 'drop-shadow(0 0 8px hsl(267 100% 65% / 0.5))'
          }}
        />
      </div>
      <span className={`${textSizeMap[size]} font-black gradient-primary bg-clip-text text-transparent`}>
        xmail
      </span>
    </div>
  );
};
