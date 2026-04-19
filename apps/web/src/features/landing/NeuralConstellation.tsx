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
}

export function NeuralConstellation({
  particleCount = 250,
  connectionDistance = 120,
  mouseRadius = 250,
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
      const accent = style.getPropertyValue('--accent').trim() || '#C1440E';
      const trust = style.getPropertyValue('--accent-trust').trim() || '#004AAD';
      return { accent, trust };
    };

    const hexToRgb = (hex: string): string => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      if (!result) return '0, 93, 232';
      return `${parseInt(result[1]!, 16)}, ${parseInt(result[2]!, 16)}, ${parseInt(result[3]!, 16)}`;
    };

    let colors = computeColors();
    let baseRgb = hexToRgb(colors.trust);
    let terracottaRgb = hexToRgb(colors.accent);

    // Observar mudanças de tema (classe .dark) para recalcular cores
    const observer = new MutationObserver(() => {
      colors = computeColors();
      baseRgb = hexToRgb(colors.trust);
      terracottaRgb = hexToRgb(colors.accent);
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
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      init();
    };

    // ─── Init Partículas ───
    const init = () => {
      if (!containerRef.current) return;
      particles = [];
      const { width, height } = containerRef.current.getBoundingClientRect();
      const count = window.innerWidth < 768 ? Math.floor(particleCount * 0.6) : particleCount;
      for (let i = 0; i < count; i++) {
        const size = Math.random() * 1.2 + 0.4;
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          baseX: Math.random() * width,
          baseY: Math.random() * height,
          size,
          baseSize: size,
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

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const count = particles.length;

      particles.forEach((p, i) => {
        // ─── TARGET DINÂMICO (A alma do movimento) ───
        let targetX = p.baseX;
        let targetY = p.baseY;
        let lerpFactor = 0.02; // Física de mel (ultra-suave)

        // 1. IDLE: Ronronar orgânico (vibração sutil de vida)
        if (state === 'idle') {
          targetX = p.baseX + Math.sin(timestamp * 0.0015 + i) * 0.6;
          targetY = p.baseY + Math.cos(timestamp * 0.0015 + i * 0.7) * 0.6;
          lerpFactor = 0.02;
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
            const dist = 40 + (i % 160); // Distribui entre 40px-200px do cursor
            targetX = mouse.x + Math.cos(angle) * dist;
            targetY = mouse.y + Math.sin(angle) * (dist * 0.7);
          }
          // Pulsar de tamanho (o "ronronar" do swarm)
          p.size = p.baseSize + Math.sin(timestamp * 0.005 + i) * 0.6;
          lerpFactor = 0.03;
        }

        // 4. WARP: Expansão radial (ignição para fora do ecrã)
        else if (state === 'warp') {
          const dx = p.x - cx;
          const dy = p.y - cy;
          targetX = p.x + dx * 0.4;
          targetY = p.y + dy * 0.4;
          p.size = Math.min(p.baseSize * 3, p.size * 1.04);
          lerpFactor = 0.08;
        }

        // ─── INTERPOLAÇÃO COM AMORTECIMENTO (A mágica "natural") ───
        p.x += (targetX - p.x) * lerpFactor;
        p.y += (targetY - p.y) * lerpFactor;

        // ─── Interação física com o rato (Sopro da Vida - só em idle) ───
        if (state === 'idle' && mouse.x >= 0) {
          const dx = mouse.x - p.x;
          const dy = mouse.y - p.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < mouseRadius) {
            const force = (mouseRadius - dist) / mouseRadius;
            p.x -= dx * force * 0.04;
            p.y -= dy * force * 0.04;
            p.size = Math.min(p.baseSize * 1.5, p.size + 0.05);
          } else {
            p.size += (p.baseSize - p.size) * 0.1;
          }
        }

        // ─── Desenho do Ponto (Subtil e limpo) ───
        ctx.fillStyle = `rgba(${baseRgb}, 0.3)`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, Math.max(0.2, p.size * 0.8), 0, Math.PI * 2);
        ctx.fill();

        // ─── Conexões Limitadas (max 3 por nó, opacidade exponencial) ───
        let connections = 0;
        for (let j = i + 1; j < count && connections < 3; j++) {
          const p2 = particles[j]!;
          const dx = p.x - p2.x;
          const dy = p.y - p2.y;
          const d = Math.sqrt(dx * dx + dy * dy);

          if (d < connectionDistance) {
            connections++;
            // Opacidade exponencial: linhas longas quase invisíveis, curtas como sopro
            const opacity = Math.pow(1 - d / connectionDistance, 2) * 0.2;

            // Fios de Ouro/Terracota: 5% de chance, reforçados no align
            const isTerracotta = Math.random() < 0.05;
            if (isTerracotta) {
              const terracottaOpacity = state === 'align' ? opacity + 0.25 : opacity + 0.12;
              ctx.strokeStyle = `rgba(${terracottaRgb}, ${Math.min(0.6, terracottaOpacity)})`;
              ctx.lineWidth = state === 'align' ? 1.0 : 0.7;
            } else {
              ctx.strokeStyle = `rgba(${baseRgb}, ${opacity})`;
              ctx.lineWidth = 0.5;
            }

            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        }
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
      <div
        className="absolute inset-0 z-0 opacity-[0.03]"
        style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 0)', backgroundSize: '30px 30px' }}
      />
      <canvas ref={canvasRef} aria-hidden="true" className="absolute inset-0 z-10 w-full h-full" />
    </div>
  );
}
