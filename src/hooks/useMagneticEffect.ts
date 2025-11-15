import { useRef, useEffect } from 'react';

interface MagneticEffectOptions {
  strength?: number;
  tolerance?: number;
}

export const useMagneticEffect = ({ strength = 0.3, tolerance = 50 }: MagneticEffectOptions = {}) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = element.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      
      const deltaX = e.clientX - centerX;
      const deltaY = e.clientY - centerY;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

      // Only apply effect if cursor is within tolerance distance
      if (distance < tolerance) {
        const offsetX = deltaX * strength;
        const offsetY = deltaY * strength;
        element.style.transform = `translate(${offsetX}px, ${offsetY}px)`;
      } else {
        element.style.transform = 'translate(0, 0)';
      }
    };

    const handleMouseLeave = () => {
      element.style.transform = 'translate(0, 0)';
    };

    element.addEventListener('mousemove', handleMouseMove);
    element.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      element.removeEventListener('mousemove', handleMouseMove);
      element.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [strength, tolerance]);

  return ref;
};
