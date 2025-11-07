import { useState, useEffect } from 'react';

export const useParallax = (speed: number = 0.5) => {
  const [offset, setOffset] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Check if mobile
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);

    // Throttle scroll events for performance
    let ticking = false;
    const handleScroll = () => {
      if (!ticking && !isMobile) {
        window.requestAnimationFrame(() => {
          setOffset(window.pageYOffset);
          ticking = false;
        });
        ticking = true;
      }
    };

    if (!isMobile) {
      window.addEventListener('scroll', handleScroll, { passive: true });
    }

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', checkMobile);
    };
  }, [isMobile]);

  // Disable parallax on mobile
  if (isMobile) {
    return {
      transform: 'translateY(0px)'
    };
  }

  return {
    transform: `translateY(${offset * speed}px)`
  };
};
