import { useEffect, useRef } from 'react';
import { useReducedMotion } from 'motion/react';

export type ChoreographyState = 'idle' | 'align' | 'swarm' | 'warp';

export interface NeuralConstellationProps {
  particleCount?: number;
  connectionDistance?: number;
  mouseRadius?: number;
  choreography?: ChoreographyState;
  className?: string;
}

class Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  index: number;
  totalCount: number;
  baseOrbitRadius: number;

  constructor(width: number, height: number, index: number, totalCount: number) {
    this.x = Math.random() * width;
    this.y = Math.random() * height;
    this.vx = (Math.random() - 0.5) * 0.5; // [-0.25, 0.25]
    this.vy = (Math.random() - 0.5) * 0.5; // [-0.25, 0.25]
    this.size = Math.random() * 2 + 1;
    this.index = index;
    this.totalCount = totalCount;
    // Calculate a random orbit radius for the alignment
    this.baseOrbitRadius = 90 + Math.random() * 200;
  }

  update(
    width: number,
    height: number,
    mouse: { x: number; y: number; radius: number },
    choreography: ChoreographyState,
    time: number
  ) {
    const cx = width / 2;
    const cy = height / 2;

    if (choreography === 'warp') {
      // Explode outwards radially from center
      const dx = this.x - cx;
      const dy = this.y - cy;
      this.x += dx * 0.08;
      this.y += dy * 0.08;
      // In warp, particles that leave the screen can wrap around to center, simulating continuous warp
      if (this.x < 0 || this.x > width || this.y < 0 || this.y > height) {
        this.x = cx + (Math.random() - 0.5) * 10;
        this.y = cy + (Math.random() - 0.5) * 10;
      }
      return;
    }

    if (choreography === 'align') {
      // Form a perfect structure (DNA / Ring)
      const angle = (this.index / this.totalCount) * Math.PI * 4 + time * 0.0005;
      const targetX = cx + Math.cos(angle) * this.baseOrbitRadius;
      const targetY = cy + Math.sin(angle) * this.baseOrbitRadius * 0.6; // Elliptical 3D look

      // Lerp structure
      this.x += (targetX - this.x) * 0.06;
      this.y += (targetY - this.y) * 0.06;
      return;
    }

    if (choreography === 'swarm') {
      // Swarm dense orbit around center or mouse
      let targetX = mouse.x >= 0 ? mouse.x : cx;
      let targetY = mouse.y >= 0 ? mouse.y : cy;

      const noiseAngle = time * 0.002 + this.index;
      targetX += Math.cos(noiseAngle) * 50;
      targetY += Math.sin(noiseAngle) * 50;

      this.vx += (targetX - this.x) * 0.003;
      this.vy += (targetY - this.y) * 0.003;

      // Friction
      this.vx *= 0.94;
      this.vy *= 0.94;

      this.x += this.vx;
      this.y += this.vy;
      return;
    }

    // Default Idle
    if (this.x < 0 || this.x > width) this.vx *= -1;
    if (this.y < 0 || this.y > height) this.vy *= -1;

    // Ensure we keep idle velocities within reasonable boundary if exiting swarm state
    if (this.vx > 1) this.vx *= 0.9;
    if (this.vy > 1) this.vy *= 0.9;
    if (this.vx < -1) this.vx *= 0.9;
    if (this.vy < -1) this.vy *= 0.9;

    this.x += this.vx;
    this.y += this.vy;

    // Mouse Interaction (Combination of repulsion + orbit)
    if (mouse.x >= 0 && mouse.y >= 0) {
      const dx = this.x - mouse.x;
      const dy = this.y - mouse.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < mouse.radius) {
        const force = (mouse.radius - dist) / mouse.radius;
        // Repulsion
        const pushX = (dx / dist) * force * 1.5;
        const pushY = (dy / dist) * force * 1.5;
        // Tangent path for orbiting effect when close
        const tangentX = (-dy / dist) * force * 0.8;
        const tangentY = (dx / dist) * force * 0.8;

        const targetX = this.x + pushX + tangentX;
        const targetY = this.y + pushY + tangentY;

        if (targetX >= 0 && targetX <= width) this.x = targetX;
        if (targetY >= 0 && targetY <= height) this.y = targetY;
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D, accentRgb: string) {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${accentRgb}, 0.8)`;
    ctx.fill();
  }
}

export function NeuralConstellation({
  particleCount,
  connectionDistance = 150,
  mouseRadius = 200,
  choreography = 'idle',
  className = '',
}: NeuralConstellationProps) {
  const reduced = useReducedMotion();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const choreoRef = useRef(choreography);
  choreoRef.current = choreography;

  useEffect(() => {
    if (reduced) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let frameId: number;
    let particles: Particle[] = [];
    let isVisible = false;
    let dpr = window.devicePixelRatio || 1;

    const mouse = { x: -1000, y: -1000, radius: mouseRadius };

    const resize = () => {
      // Limitar a DPR a 2 (Telas Retina iPhone Pro) para não sobrecarregar GPU mobile em PWA
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      const { innerWidth, innerHeight } = window;
      
      canvas.width = innerWidth * dpr;
      canvas.height = innerHeight * dpr;
      canvas.style.width = `${innerWidth}px`;
      canvas.style.height = `${innerHeight}px`;
      
      ctx.scale(dpr, dpr);
      
      const count = particleCount ?? (innerWidth < 768 ? 60 : 120);
      if (particles.length !== count) {
        particles = Array.from({ length: count }, (_, i) => new Particle(innerWidth, innerHeight, i, count));
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
    };
    
    // Suporte para touch no Mobile (Apple Safari/PWA)
    const handleTouchMove = (e: TouchEvent) => {
      const rect = canvas.getBoundingClientRect();
      if (e.touches.length > 0 && e.touches[0]) {
        mouse.x = e.touches[0].clientX - rect.left;
        mouse.y = e.touches[0].clientY - rect.top;
      }
    };
    
    const handleMouseLeave = () => {
      mouse.x = -1000;
      mouse.y = -1000;
    };

    let startTime = performance.now();

    const animate = (timestamp: number) => {
      if (!isVisible) return;
      
      const time = timestamp - startTime;
      const { innerWidth, innerHeight } = window;
      
      // If warp stream, add slight fade instead of clear rect for trailing effect
      if (choreoRef.current === 'warp') {
        ctx.fillStyle = 'rgba(5, 5, 5, 0.3)'; // Match background with trail effect
        ctx.fillRect(0, 0, innerWidth, innerHeight);
      } else {
        ctx.clearRect(0, 0, innerWidth, innerHeight);
      }

      // Detect Accent Color for Canvas Elements dynamically based on Light/Dark
      const isDark = document.documentElement.classList.contains('dark') || 
        (!document.documentElement.classList.contains('light') && window.matchMedia('(prefers-color-scheme: dark)').matches);
      const accentRgb = isDark ? '255, 92, 0' : '0, 74, 173'; // Terracota(Dark) vs Blue(Light)

      // Update and draw particles
      particles.forEach((p) => {
        p.update(innerWidth, innerHeight, mouse, choreoRef.current, time);
        p.draw(ctx, accentRgb);
      });

      // Draw connections
      for (let i = 0; i < particles.length; i++) {
        const p1 = particles[i]!;
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j]!;
          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          
          let distLimit = connectionDistance;
          // In warp or align, expand or reduce connections for extreme density
          if (choreoRef.current === 'align') distLimit = connectionDistance * 0.8;
          if (choreoRef.current === 'warp') distLimit = connectionDistance * 1.5;

          if (dist < distLimit) {
            const opacity = 1 - dist / distLimit;
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `rgba(${accentRgb}, ${opacity * 0.5})`;
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }
      }

      frameId = requestAnimationFrame(animate);
    };

    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchstart', handleTouchMove, { passive: true });
    window.addEventListener('mouseleave', handleMouseLeave);
    window.addEventListener('touchend', handleMouseLeave);

    const observer = new IntersectionObserver((entries) => {
      if (entries.length > 0 && entries[0]) {
        const currentlyVisible = entries[0].isIntersecting;
        if (currentlyVisible !== isVisible) {
          isVisible = currentlyVisible;
          if (isVisible) {
            startTime = performance.now();
            frameId = requestAnimationFrame(animate);
          } else {
            cancelAnimationFrame(frameId);
          }
        }
      }
    });
    observer.observe(canvas);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchstart', handleTouchMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
      window.removeEventListener('touchend', handleMouseLeave);
      observer.disconnect();
    };
  }, [reduced, particleCount, connectionDistance, mouseRadius]);

  if (reduced) {
    return (
      <div
        className={`absolute inset-0 bg-[radial-gradient(circle_at_center,color-mix(in_srgb,var(--color-accent)_8%,transparent),transparent_70%)] ${className}`}
        aria-hidden="true"
      />
    );
  }

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={`absolute inset-0 w-full h-full ${className}`}
    />
  );
}
