import xmailLogo from '@/assets/xmail-logo.png';

interface LogoProps {
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

const sizeMap = {
  small: 'h-8 sm:h-10',
  medium: 'h-10 sm:h-12',
  large: 'h-14 sm:h-16 md:h-20',
};

// Initial clipped width (square box)
const clipWidthMap = {
  small: 'max-w-[32px] sm:max-w-[40px]',
  medium: 'max-w-[40px] sm:max-w-[48px]',
  large: 'max-w-[56px] sm:max-w-[64px] md:max-w-[80px]',
};

// Border radius per size
const radiusMap = {
  small: 'rounded-[10px] sm:rounded-[12px]',
  medium: 'rounded-[12px] sm:rounded-[14px]',
  large: 'rounded-[14px] sm:rounded-[16px] md:rounded-[18px]',
};

// Expanded width on hover
const revealMaxMap = {
  small: 'group-hover:max-w-[180px]',
  medium: 'group-hover:max-w-[220px]',
  large: 'group-hover:max-w-[300px]',
};

export const Logo = ({ size = 'medium', className = '' }: LogoProps) => {
  return (
    <div
      className={`inline-flex items-center group ${className}`}
      role="img"
      aria-label="xmail logo"
    >
      <div
        className={`relative overflow-hidden transition-all duration-500 ease-out ${radiusMap[size]} ${clipWidthMap[size]} ${revealMaxMap[size]} bg-primary/90 ring-1 ring-white/10 shadow-[0_0_12px_rgba(59,130,246,0.25)]`}
      >
        {/* Logo image */}
        <img
          src={xmailLogo}
          alt="xmail"
          className={`${sizeMap[size]} w-auto transition-transform duration-500 group-hover:scale-105`}
          style={{
            filter: 'drop-shadow(0 0 8px rgba(59, 130, 246, 0.3))'
          }}
        />

        {/* Blue cover that slides away on hover */}
        <div
          className={`pointer-events-none absolute inset-0 z-10 ${radiusMap[size]} bg-primary transition-all duration-500 ease-out origin-left w-full group-hover:w-0`}
        />
      </div>
    </div>
  );
};
