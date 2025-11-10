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

// Initial clipped width to show only the "X" part
const clipWidthMap = {
  small: 'max-w-[32px] sm:max-w-[40px]',
  medium: 'max-w-[40px] sm:max-w-[48px]',
  large: 'max-w-[56px] sm:max-w-[64px] md:max-w-[80px]',
};

export const Logo = ({ size = 'medium', className = '' }: LogoProps) => {
  return (
    <div
      className={`inline-flex items-center group ${className}`}
      role="img"
      aria-label="xmail logo"
    >
      <div className={`overflow-hidden ${clipWidthMap[size]} group-hover:max-w-[300px] transition-all duration-500 ease-out`}>
        <img
          src={xmailLogo}
          alt="xmail"
          className={`${sizeMap[size]} w-auto transition-transform duration-300 group-hover:scale-105`}
          style={{
            filter: 'drop-shadow(0 0 8px rgba(59, 130, 246, 0.3))'
          }}
        />
      </div>
    </div>
  );
};
