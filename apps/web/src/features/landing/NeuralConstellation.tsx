import { useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(useGSAP);

export type ChoreographyState = 'idle' | 'align' | 'swarm' | 'warp';

interface Particle {
  x: number;
  y: number;
  baseX: number;
  baseY: number;
  size: number;
  baseSize: number;
  /** 0–1: Controls depth-of-field effect (larger = closer/brighter) */
  depth: number;
  /** Phase offset for twinkle animation */
  twinklePhase: number;
  /** Twinkle speed multiplier */
  twinkleSpeed: number;
  /** true = accent-colored (terracotta/amber), false = cool blue/white */
  isAccent: boolean;
  /** Individual opacity multiplier for variety */
  opacityBase: number;
}

export function NeuralConstellation({
  particleCount = 300,
  connectionDistance = 140,
  mouseRadius = 280,
  choreography = 'idle' as ChoreographyState,
  className = '',
}: {
  particleCount?: number;
  connectionDistance?: number;
  mouseRadius?: number;
  choreography?: ChoreographyState;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const choreoRef = useRef(choreography);
  choreoRef.current = choreography;

  useGSAP(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let particles: Particle[] = [];
    const mouse = { x: -1000, y: -1000 };

    // ─── Leitura das CSS Vars do Tailwind v4 (SSOT de Cor) ───
    const computeColors = () => {
      const style = getComputedStyle(document.documentElement);
      const accent = style.getPropertyValue('--accent-terracotta').trim() || '#D2691E';
      const accentSoft = style.getPropertyValue('--accent-terracotta-soft').trim() || '#E8945C';
      const trust = style.getPropertyValue('--institutional-cobalt').trim() || '#004AAD';
      const inkPrimary = style.getPropertyValue('--ink-primary').trim() || '#2A2724';
      return { accent, accentSoft, trust, inkPrimary };
    };

    const hexToRgb = (hex: string): string => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      if (!result) return '0, 93, 232';
      const [, red, green, blue] = result;
      if (!red || !green || !blue) return '0, 93, 232';
      return `${String(parseInt(red, 16))}, ${String(parseInt(green, 16))}, ${String(parseInt(blue, 16))}`;
    };

    const rgba = (rgb: string, alpha: number): string => `rgba(${rgb}, ${String(alpha)})`;
    const rgbaChannels = (red: number, green: number, blue: number, alpha: number): string =>
      `rgba(${String(red)}, ${String(green)}, ${String(blue)}, ${String(alpha)})`;

    let colors = computeColors();
    let trustRgb = hexToRgb(colors.trust);
    let accentRgb = hexToRgb(colors.accent);
    let accentSoftRgb = hexToRgb(colors.accentSoft);

    // Detect dark mode
    const isDark = () => document.documentElement.classList.contains('dark');

    // Observar mudanças de tema (classe .dark) para recalcular cores
    const observer = new MutationObserver(() => {
      colors = computeColors();
      trustRgb = hexToRgb(colors.trust);
      accentRgb = hexToRgb(colors.accent);
      accentSoftRgb = hexToRgb(colors.accentSoft);
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

    // ─── Resize com High-DPI (DPR) ───
    const resize = () => {
      const el = containerRef.current;
      if (!el) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = el.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${String(rect.width)}px`;
      canvas.style.height = `${String(rect.height)}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      init();
    };

    // ─── Init Partículas (Constellation-grade) ───
    const init = () => {
      if (!containerRef.current) return;
      particles = [];
      const { width, height } = containerRef.current.getBoundingClientRect();
      const count = window.innerWidth < 768 ? Math.floor(particleCount * 0.5) : particleCount;

      for (let i = 0; i < count; i++) {
        // Size distribution: mostly small stars, a few bright ones
        const sizeRoll = Math.random();
        let size: number;
        if (sizeRoll < 0.6) {
          size = Math.random() * 0.8 + 0.3; // tiny stars (60%)
        } else if (sizeRoll < 0.9) {
          size = Math.random() * 1.5 + 0.8; // medium stars (30%)
        } else {
          size = Math.random() * 2.5 + 1.5; // bright stars (10%)
        }

        const depth = Math.random();
        const isAccent = Math.random() < 0.15; // 15% are warm-colored

        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          baseX: Math.random() * width,
          baseY: Math.random() * height,
          size,
          baseSize: size,
          depth,
          twinklePhase: Math.random() * Math.PI * 2,
          twinkleSpeed: 0.8 + Math.random() * 2.5,
          isAccent,
          opacityBase: 0.3 + Math.random() * 0.7,
        });
      }
    };

    // ─── O Loop de Animação ───
    let animId: number;

    const animate = (timestamp: number) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) { animId = requestAnimationFrame(animate); return; }

      const w = rect.width;
      const h = rect.height;
      const cx = w / 2;
      const cy = h / 2;
      const state = choreoRef.current;
      const dark = isDark();

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // ─── Nebula Radial Glow (atmospheric backdrop) ───
      const nebulaGrad = ctx.createRadialGradient(cx, cy * 0.85, 0, cx, cy * 0.85, Math.max(w, h) * 0.55);
      if (dark) {
        nebulaGrad.addColorStop(0, rgba(accentRgb, 0.06));
        nebulaGrad.addColorStop(0.3, rgba(trustRgb, 0.03));
        nebulaGrad.addColorStop(0.7, 'rgba(0, 0, 0, 0)');
      } else {
        nebulaGrad.addColorStop(0, rgba(accentRgb, 0.04));
        nebulaGrad.addColorStop(0.3, rgba(trustRgb, 0.02));
        nebulaGrad.addColorStop(0.7, 'rgba(0, 0, 0, 0)');
      }
      ctx.fillStyle = nebulaGrad;
      ctx.fillRect(0, 0, w, h);

      const count = particles.length;

      // ─── Draw connections first (behind particles) ───
      for (let i = 0; i < count; i++) {
        const p = particles[i];
        if (!p) continue;
        let connections = 0;
        for (let j = i + 1; j < count && connections < 4; j++) {
          const p2 = particles[j];
          if (!p2) continue;
          const dx = p.x - p2.x;
          const dy = p.y - p2.y;
          const d = Math.sqrt(dx * dx + dy * dy);

          if (d < connectionDistance) {
            connections++;
            // Exponential opacity falloff
            const proximity = 1 - d / connectionDistance;
            const opacity = Math.pow(proximity, 2.5) * 0.35;

            // Terracotta golden threads: when both ends are accent or 3% chance
            const isGoldenThread = (p.isAccent && p2.isAccent) || Math.random() < 0.03;

            if (isGoldenThread) {
              const glowOpacity = state === 'align' ? opacity + 0.3 : opacity + 0.15;
              ctx.strokeStyle = rgba(accentSoftRgb, Math.min(0.7, glowOpacity));
              ctx.lineWidth = state === 'align' ? 1.2 : 0.8;
              // Subtle glow on golden threads
              ctx.shadowColor = rgba(accentRgb, 0.4);
              ctx.shadowBlur = 6;
            } else {
              const lineColor = dark
                ? rgba(trustRgb, opacity * 0.8)
                : rgba(trustRgb, opacity * 0.5);
              ctx.strokeStyle = lineColor;
              ctx.lineWidth = 0.6;
              ctx.shadowColor = 'transparent';
              ctx.shadowBlur = 0;
            }

            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
            ctx.shadowBlur = 0;
          }
        }
      }

      // ─── Draw particles (stars) ───
      particles.forEach((p, i) => {
        // ─── TARGET DINÂMICO (A alma do movimento) ───
        let targetX = p.baseX;
        let targetY = p.baseY;
        let lerpFactor = 0.02; // Física de mel (ultra-suave)

        // 1. IDLE: Ronronar orgânico (vibração sutil de vida)
        if (state === 'idle') {
          const breathe = Math.sin(timestamp * 0.0008 + i * 0.3) * 1.2;
          targetX = p.baseX + Math.sin(timestamp * 0.0012 + i) * 0.8 + breathe * 0.3;
          targetY = p.baseY + Math.cos(timestamp * 0.0012 + i * 0.7) * 0.8 + breathe * 0.2;
          lerpFactor = 0.018;
        }

        // 2. ALIGN: Estrutura Académica (Círculo/Hélice perfeita)
        else if (state === 'align') {
          const angle = (i / count) * Math.PI * 2;
          const radius = Math.min(w, h) * 0.25 + Math.sin(timestamp * 0.001 + i * 0.5) * 15;
          targetX = cx + Math.cos(angle + timestamp * 0.0003) * radius;
          targetY = cy + Math.sin(angle + timestamp * 0.0003) * radius * 0.6;
          lerpFactor = 0.035;
        }

        // 3. SWARM: Órbita densa ao redor do rato
        else if (state === 'swarm') {
          if (mouse.x >= 0) {
            const angle = (i / count) * Math.PI * 2 + timestamp * 0.001;
            const dist = 40 + (i % 160);
            targetX = mouse.x + Math.cos(angle) * dist;
            targetY = mouse.y + Math.sin(angle) * (dist * 0.7);
          }
          p.size = p.baseSize + Math.sin(timestamp * 0.005 + i) * 0.6;
          lerpFactor = 0.03;
        }

        // 4. WARP: Expansão radial (ignição para fora do ecrã)
        else {
          const dx = p.x - cx;
          const dy = p.y - cy;
          targetX = p.x + dx * 0.4;
          targetY = p.y + dy * 0.4;
          p.size = Math.min(p.baseSize * 3, p.size * 1.04);
          lerpFactor = 0.08;
        }

        // ─── INTERPOLAÇÃO COM AMORTECIMENTO ───
        p.x += (targetX - p.x) * lerpFactor;
        p.y += (targetY - p.y) * lerpFactor;

        // ─── Interação física com o rato (Sopro da Vida - só em idle) ───
        if (state === 'idle' && mouse.x >= 0) {
          const dx = mouse.x - p.x;
          const dy = mouse.y - p.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < mouseRadius) {
            const force = (mouseRadius - dist) / mouseRadius;
            p.x -= dx * force * 0.05;
            p.y -= dy * force * 0.05;
            p.size = Math.min(p.baseSize * 2, p.size + 0.08);
          } else {
            p.size += (p.baseSize - p.size) * 0.08;
          }
        }

        // ─── Twinkle Animation ───
        const twinkle = Math.sin(timestamp * 0.001 * p.twinkleSpeed + p.twinklePhase);
        const twinkleIntensity = (twinkle * 0.5 + 0.5); // 0–1
        const starOpacity = p.opacityBase * (0.4 + twinkleIntensity * 0.6);

        // ─── Star Drawing with Glow ───
        const currentSize = Math.max(0.3, p.size * (0.8 + twinkleIntensity * 0.4));

        if (p.isAccent) {
          // ── Accent stars: warm terracotta/amber glow ──
          ctx.shadowColor = rgba(accentRgb, 0.6 * starOpacity);
          ctx.shadowBlur = currentSize * 8;
          ctx.fillStyle = rgba(accentSoftRgb, starOpacity);
        } else {
          // ── Cool stars: silver/blue glow ──
          const starColor = dark
            ? rgbaChannels(220, 225, 240, starOpacity)
            : rgba(trustRgb, starOpacity * 0.7);
          ctx.shadowColor = dark
            ? rgbaChannels(180, 200, 255, 0.4 * starOpacity)
            : rgba(trustRgb, 0.3 * starOpacity);
          ctx.shadowBlur = currentSize * 5;
          ctx.fillStyle = starColor;
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, currentSize, 0, Math.PI * 2);
        ctx.fill();

        // ── Second pass: bright core for larger stars ──
        if (p.baseSize > 1.2) {
          ctx.shadowBlur = 0;
          const coreOpacity = starOpacity * 0.9;
          ctx.fillStyle = p.isAccent
            ? rgbaChannels(255, 220, 180, coreOpacity)
            : rgbaChannels(255, 255, 255, dark ? coreOpacity : coreOpacity * 0.5);
          ctx.beginPath();
          ctx.arc(p.x, p.y, currentSize * 0.4, 0, Math.PI * 2);
          ctx.fill();
        }

        // ── Cross flare on biggest stars ──
        if (p.baseSize > 2.0 && twinkleIntensity > 0.6) {
          const flareLen = currentSize * 4 * twinkleIntensity;
          const flareOpacity = (twinkleIntensity - 0.6) * 2.5 * starOpacity * 0.3;
          const flareColor = p.isAccent
            ? rgba(accentSoftRgb, flareOpacity)
            : rgbaChannels(200, 210, 255, flareOpacity);
          ctx.strokeStyle = flareColor;
          ctx.lineWidth = 0.6;
          ctx.shadowBlur = 0;

          // Horizontal flare
          ctx.beginPath();
          ctx.moveTo(p.x - flareLen, p.y);
          ctx.lineTo(p.x + flareLen, p.y);
          ctx.stroke();

          // Vertical flare
          ctx.beginPath();
          ctx.moveTo(p.x, p.y - flareLen);
          ctx.lineTo(p.x, p.y + flareLen);
          ctx.stroke();
        }

        // Reset shadow for next iteration
        ctx.shadowBlur = 0;
      });

      animId = requestAnimationFrame(animate);
    };

    // ─── Event Listeners ───
    const handleMouseMove = (e: MouseEvent) => {
      const r = canvas.getBoundingClientRect();
      mouse.x = e.clientX - r.left;
      mouse.y = e.clientY - r.top;
    };
    const handleMouseLeave = () => {
      mouse.x = -1000;
      mouse.y = -1000;
    };

    window.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseleave', handleMouseLeave);
    window.addEventListener('resize', resize);

    resize();
    animId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseleave', handleMouseLeave);
      window.removeEventListener('resize', resize);
      observer.disconnect();
    };
  }, { scope: containerRef });

  return (
    <div ref={containerRef} className={`absolute inset-0 w-full h-full overflow-hidden pointer-events-none ${className}`}>
      <canvas ref={canvasRef} aria-hidden="true" className="absolute inset-0 z-10 w-full h-full" />
    </div>
  );
}
