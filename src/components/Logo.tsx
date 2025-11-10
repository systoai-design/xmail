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

export const Logo = ({ size = 'medium', className = '' }: LogoProps) => {
  return (
    <div
      className={`inline-flex items-center group ${className}`}
      role="img"
      aria-label="xmail logo"
    >
      <img
        src={xmailLogo}
        alt="xmail"
        className={`${sizeMap[size]} w-auto hover:scale-105 transition-all duration-300`}
        style={{
          filter: 'drop-shadow(0 0 8px rgba(59, 130, 246, 0.3))'
        }}
      />
    </div>
  );
};
