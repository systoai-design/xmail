import { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  progress: number;
  speed: number;
  encrypted: boolean;
}

interface WalletNode {
  x: number;
  y: number;
  pulse: number;
}

export const ParticleEncryption = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    // Wallet nodes
    const nodes: WalletNode[] = [
      { x: 0.2, y: 0.3, pulse: 0 },
      { x: 0.8, y: 0.3, pulse: 0 },
      { x: 0.2, y: 0.7, pulse: 0.5 },
      { x: 0.8, y: 0.7, pulse: 1 },
    ];

    // Particles
    const particles: Particle[] = [];
    const maxParticles = 30;

    const createParticle = () => {
      const fromNode = nodes[Math.floor(Math.random() * nodes.length)];
      const toNode = nodes[Math.floor(Math.random() * nodes.length)];
      
      if (fromNode === toNode) return;

      particles.push({
        x: fromNode.x * canvas.width,
        y: fromNode.y * canvas.height,
        targetX: toNode.x * canvas.width,
        targetY: toNode.y * canvas.height,
        progress: 0,
        speed: 0.005 + Math.random() * 0.005,
        encrypted: false,
      });
    };

    // Animation loop
    let animationId: number;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw wallet nodes
      nodes.forEach((node) => {
        node.pulse = (node.pulse + 0.02) % (Math.PI * 2);
        const pulseSize = 8 + Math.sin(node.pulse) * 3;
        const x = node.x * canvas.width;
        const y = node.y * canvas.height;

        // Outer glow
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, pulseSize * 3);
        gradient.addColorStop(0, 'rgba(74, 158, 255, 0.3)');
        gradient.addColorStop(1, 'rgba(74, 158, 255, 0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, pulseSize * 3, 0, Math.PI * 2);
        ctx.fill();

        // Core node
        ctx.fillStyle = 'rgba(74, 158, 255, 0.8)';
        ctx.beginPath();
        ctx.arc(x, y, pulseSize, 0, Math.PI * 2);
        ctx.fill();

        // Inner glow
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.beginPath();
        ctx.arc(x, y, pulseSize * 0.5, 0, Math.PI * 2);
        ctx.fill();
      });

      // Update and draw particles
      particles.forEach((particle, index) => {
        particle.progress += particle.speed;

        // Encrypt at 50% progress
        if (particle.progress > 0.5 && !particle.encrypted) {
          particle.encrypted = true;
        }

        if (particle.progress >= 1) {
          particles.splice(index, 1);
          return;
        }

        // Bezier curve path
        const t = particle.progress;
        const controlX = (particle.x + particle.targetX) / 2;
        const controlY = (particle.y + particle.targetY) / 2 - 100;
        
        const x = (1 - t) * (1 - t) * particle.x + 2 * (1 - t) * t * controlX + t * t * particle.targetX;
        const y = (1 - t) * (1 - t) * particle.y + 2 * (1 - t) * t * controlY + t * t * particle.targetY;

        // Draw particle with glow
        const color = particle.encrypted ? '0, 255, 255' : '74, 158, 255';
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, 6);
        gradient.addColorStop(0, `rgba(${color}, 1)`);
        gradient.addColorStop(0.5, `rgba(${color}, 0.6)`);
        gradient.addColorStop(1, `rgba(${color}, 0)`);
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, 6, 0, Math.PI * 2);
        ctx.fill();

        // Draw lock icon at 50% encryption point
        if (Math.abs(particle.progress - 0.5) < 0.05) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
          ctx.font = '12px Arial';
          ctx.fillText('🔒', x - 6, y + 4);
        }
      });

      // Create new particles
      if (particles.length < maxParticles && Math.random() < 0.1) {
        createParticle();
      }

      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none opacity-60"
      style={{ width: '100%', height: '100%' }}
    />
  );
};
