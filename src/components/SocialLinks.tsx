import xLogo from '@/assets/x-logo.png';
import pumpfunLogo from '@/assets/pumpfun-logo.png';

interface SocialLinksProps {
  className?: string;
}

export const SocialLinks = ({ className = '' }: SocialLinksProps) => {
  return (
    <div className={`flex items-center gap-2 sm:gap-3 ${className}`}>
      {/* X (Twitter) Link */}
      <a
        href="https://x.com/xmail402"
        target="_blank"
        rel="noopener noreferrer"
        className="opacity-70 hover:opacity-100 transition-opacity"
        aria-label="Follow us on X (Twitter)"
      >
        <img src={xLogo} alt="X (Twitter)" className="w-6 h-6 sm:w-7 sm:h-7" />
      </a>

      {/* Pumpfun Link */}
      <a
        href="https://pump.fun/board"
        target="_blank"
        rel="noopener noreferrer"
        className="opacity-70 hover:opacity-100 transition-opacity"
        aria-label="Visit Pumpfun"
      >
        <img src={pumpfunLogo} alt="Pumpfun" className="w-6 h-6 sm:w-7 sm:h-7" />
      </a>
    </div>
  );
};
