export const useParallax = (speed: number = 0.5) => {
  // Parallax disabled to prevent black background flashing during scroll
  return {
    transform: 'none'
  };
};
