import { useEffect, useRef, useState } from 'react';
import { Shield, Lock, Zap } from 'lucide-react';

export const Shield3D = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const animationFrameRef = useRef<number>();
  const rotationRef = useRef({ x: 0, y: 0 });
  const targetRotationRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const baseSize = Math.min(rect.width, rect.height) * 0.35;

    // Encryption layers data
    const layers = [
      { radius: baseSize * 1.3, color: 'rgba(74, 158, 255, 0.1)', width: 2, particles: [] as any[] },
      { radius: baseSize * 1.0, color: 'rgba(0, 212, 255, 0.15)', width: 3, particles: [] as any[] },
      { radius: baseSize * 0.7, color: 'rgba(34, 197, 94, 0.2)', width: 4, particles: [] as any[] },
    ];

    // Initialize particles for each layer
    layers.forEach(layer => {
      const particleCount = 8;
      for (let i = 0; i < particleCount; i++) {
        layer.particles.push({
          angle: (Math.PI * 2 * i) / particleCount,
          speed: 0.01 + Math.random() * 0.01,
          size: 2 + Math.random() * 2,
        });
      }
    });

    const drawShield = () => {
      ctx.clearRect(0, 0, rect.width, rect.height);

      // Smooth rotation interpolation
      rotationRef.current.x += (targetRotationRef.current.x - rotationRef.current.x) * 0.1;
      rotationRef.current.y += (targetRotationRef.current.y - rotationRef.current.y) * 0.1;

      const rotation = isHovered ? Math.PI / 6 : 0;
      const tilt = rotationRef.current.x;

      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(tilt * 0.5);

      // Draw encryption layers
      layers.forEach((layer, layerIndex) => {
        const layerRotation = rotation + (layerIndex * Math.PI / 6);
        
        // Draw ring
        ctx.save();
        ctx.rotate(layerRotation);
        ctx.strokeStyle = layer.color;
        ctx.lineWidth = layer.width;
        ctx.shadowBlur = 10;
        ctx.shadowColor = layer.color;
        
        ctx.beginPath();
        ctx.arc(0, 0, layer.radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();

        // Draw particles on ring
        layer.particles.forEach(particle => {
          particle.angle += particle.speed;
          
          const x = Math.cos(particle.angle + layerRotation) * layer.radius;
          const y = Math.sin(particle.angle + layerRotation) * layer.radius;
          
          ctx.save();
          ctx.shadowBlur = 15;
          ctx.shadowColor = layer.color;
          ctx.fillStyle = layer.color.replace('0.1', '0.8').replace('0.15', '0.9').replace('0.2', '1');
          ctx.beginPath();
          ctx.arc(x, y, particle.size, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        });
      });

      // Draw central shield shape
      const shieldPath = new Path2D();
      const shieldSize = baseSize * 0.5;
      shieldPath.moveTo(0, -shieldSize);
      shieldPath.quadraticCurveTo(shieldSize * 0.6, -shieldSize * 0.8, shieldSize * 0.6, 0);
      shieldPath.quadraticCurveTo(shieldSize * 0.6, shieldSize * 0.8, 0, shieldSize);
      shieldPath.quadraticCurveTo(-shieldSize * 0.6, shieldSize * 0.8, -shieldSize * 0.6, 0);
      shieldPath.quadraticCurveTo(-shieldSize * 0.6, -shieldSize * 0.8, 0, -shieldSize);
      
      const gradient = ctx.createLinearGradient(0, -shieldSize, 0, shieldSize);
      gradient.addColorStop(0, 'rgba(74, 158, 255, 0.3)');
      gradient.addColorStop(0.5, 'rgba(0, 212, 255, 0.2)');
      gradient.addColorStop(1, 'rgba(34, 197, 94, 0.3)');
      
      ctx.fillStyle = gradient;
      ctx.fill(shieldPath);
      
      ctx.strokeStyle = 'rgba(74, 158, 255, 0.6)';
      ctx.lineWidth = 3;
      ctx.shadowBlur = 20;
      ctx.shadowColor = 'rgba(74, 158, 255, 0.8)';
      ctx.stroke(shieldPath);

      ctx.restore();

      animationFrameRef.current = requestAnimationFrame(drawShield);
    };

    drawShield();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isHovered]);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left - rect.width / 2) / (rect.width / 2);
    const y = (e.clientY - rect.top - rect.height / 2) / (rect.height / 2);

    targetRotationRef.current = { x: y * 0.3, y: x * 0.3 };
  };

  const handleMouseLeave = () => {
    targetRotationRef.current = { x: 0, y: 0 };
    setIsHovered(false);
  };

  return (
    <div className="relative w-full max-w-md mx-auto">
      <canvas
        ref={canvasRef}
        className="w-full h-[400px] cursor-pointer"
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={handleMouseLeave}
      />
      
      {/* Feature badges around shield */}
      <div className="absolute top-0 left-0 glass-card px-3 py-2 rounded-lg border border-primary/30 animate-float">
        <div className="flex items-center gap-2">
          <Lock className="w-4 h-4 text-primary" />
          <span className="text-xs font-semibold">AES-256</span>
        </div>
      </div>
      
      <div className="absolute top-8 right-0 glass-card px-3 py-2 rounded-lg border border-success/30 animate-float" style={{ animationDelay: '0.5s' }}>
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-success" />
          <span className="text-xs font-semibold">Zero-Knowledge</span>
        </div>
      </div>
      
      <div className="absolute bottom-8 left-4 glass-card px-3 py-2 rounded-lg border border-accent/30 animate-float" style={{ animationDelay: '1s' }}>
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-accent" />
          <span className="text-xs font-semibold">Blockchain</span>
        </div>
      </div>

      <div className="text-center mt-6">
        <p className="text-sm text-muted-foreground">
          Hover to interact • Multiple encryption layers protect your data
        </p>
      </div>
    </div>
  );
};
