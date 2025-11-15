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
        className={`relative overflow-hidden transition-all duration-500 ease-out ${radiusMap[size]} ${clipWidthMap[size]} ${revealMaxMap[size]} bg-primary/95 ring-2 ring-white/15 shadow-[0_0_20px_rgba(74,158,255,0.3),0_0_40px_rgba(74,158,255,0.15)] group-hover:shadow-[0_0_30px_rgba(74,158,255,0.4),0_0_60px_rgba(74,158,255,0.2)]`}
      >
        {/* Logo image */}
        <img
          src={xmailLogo}
          alt="xmail"
          className={`${sizeMap[size]} w-auto transition-transform duration-500 group-hover:scale-105`}
          style={{
            filter: 'drop-shadow(0 0 12px rgba(74, 158, 255, 0.4))'
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
