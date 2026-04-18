import { useRef } from 'react';
import { useReducedMotion } from 'motion/react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(useGSAP);

export type ChoreographyState = 'idle' | 'align' | 'swarm' | 'warp';

export interface NeuralConstellationProps {
  particleCount?: number;
  connectionDistance?: number;
  mouseRadius?: number;
  choreography?: ChoreographyState;
  className?: string;
}

export function NeuralConstellation({
  particleCount = 750, // 3x Mais neurónios conforme pedido
  connectionDistance = 85, // Reduzido ligeiramente só para a CPU mobile / browser aguentar 750 items a cruzar (280 mil cálculos de linha/frame!)
  mouseRadius = 250,
  choreography = 'idle',
  className = '',
}: NeuralConstellationProps) {
  const reduced = useReducedMotion();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Usamos uma ref para o loop de animação aceder ao estado mais recente sem re-renderizar
  const choreoRef = useRef(choreography);
  choreoRef.current = choreography;

  useGSAP(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let particles: Particle[] = [];
    const mouse = { x: -1000, y: -1000 };
    let dpr = window.devicePixelRatio || 1;

    // Respeitar o ADR "Herança Invisível": Partículas Elétricas puras para restaurar a vibração e classe gamificada! (Neon Dark, Blue Light)
    let isDark = document.documentElement.classList.contains('dark') || 
                 window.matchMedia('(prefers-color-scheme: dark)').matches;
    let baseRgb = isDark ? '255, 107, 0' : '0, 93, 232';

    const resize = () => {
      const el = containerRef.current;
      if (!el) return;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = el.getBoundingClientRect();
      // Em vez da altura da janela estática inicial, cobrimos TUDO o que o section empurra. Isto resolve o corte invisível do Canvas em scrool longo!
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      ctx.scale(dpr, dpr);
    };

    class Particle {
      x: number; y: number; vx: number; vy: number; size: number;
      index: number; totalCount: number; baseOrbitRadius: number;
      
      constructor(width: number, height: number, index: number, totalCount: number) {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        // Velocidade base suave flutuante
        this.vx = (Math.random() - 0.5) * 0.4;
        this.vy = (Math.random() - 0.5) * 0.4;
        this.size = Math.random() * 1.0 + 0.6; // Pontos ultra finos e subtis
        this.index = index;
        this.totalCount = totalCount;
        this.baseOrbitRadius = 120 + Math.random() * 300;
      }

      update(w: number, h: number, time: number) {
        const cx = w / 2;
        const cy = h / 2;

        if (choreoRef.current === 'warp') {
          // Acesso: Warp Speed expansivo
          const dx = this.x - cx;
          const dy = this.y - cy;
          this.x += dx * 0.08;
          this.y += dy * 0.08;
          if (this.x < 0 || this.x > w || this.y < 0 || this.y > h) {
            this.x = cx + (Math.random() - 0.5) * 10;
            this.y = cy + (Math.random() - 0.5) * 10;
          }
          return;
        }

        if (choreoRef.current === 'align') {
          // Foco no E-mail (ADN / Estrutura Perfeita)
          const angle = (this.index / this.totalCount) * Math.PI * 4 + time * 0.0005;
          const targetX = cx + Math.cos(angle) * this.baseOrbitRadius;
          const targetY = cy + Math.sin(angle) * this.baseOrbitRadius * 0.6; // Perspetiva 3D elíptica

          this.x += (targetX - this.x) * 0.06;
          this.y += (targetY - this.y) * 0.06;
          return;
        }

        if (choreoRef.current === 'swarm') {
          // Foco "Swarm" Orgânico (Dinâmica de Fluidos/Boids)
          const targetX = mouse.x >= 0 ? mouse.x : cx;
          const targetY = mouse.y >= 0 ? mouse.y : cy;
          
          const dx = targetX - this.x;
          const dy = targetY - this.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          
          // Cria zonas de conforto variadas para cada neurónio (pulsação natural densa) 
          // 40 a 300px forma uma neblina maciça ao redor do card e botoes, sem vazio no meio
          const comfortZone = 40 + (this.index % 260); 
          
          let accelX = 0;
          let accelY = 0;

          if (dist > comfortZone) {
            // Atração elástica hiper suave se estão fora da órbita
            accelX = (dx / dist) * 0.04;
            accelY = (dy / dist) * 0.04;
          } else if (dist < comfortZone * 0.6) {
            // Repulsão magnética suave (abrem espaço natural p/ os botões se respirar)
            accelX = -(dx / dist) * 0.09;
            accelY = -(dy / dist) * 0.09;
          } else {
            // Dentro do Sweet-spot: Flutuação pulsante! (Respiração celular da rede)
            const noise = Math.sin(time * 0.002 + this.index) * 0.06;
            accelX = Math.cos(this.index) * noise;
            accelY = Math.sin(this.index) * noise;
          }

          // Orbitam lindamente as bordas 
          const orbitX = (-dy / dist) * 0.015;
          const orbitY = (dx / dist) * 0.015;

          this.vx += accelX + orbitX;
          this.vy += accelY + orbitY;
          
          // Fricção de líquido viscoso para fluidez super estruturada e elegante (não caótica)
          this.vx *= 0.94;
          this.vy *= 0.94;
        } else {
          // Idle Natural Bound Checking
          if (this.x < 0 || this.x > w) this.vx *= -1;
          if (this.y < 0 || this.y > h) this.vy *= -1;
          
          if (this.vx > 1) this.vx *= 0.9;
          if (this.vx < -1) this.vx *= 0.9;
          if (this.vy > 1) this.vy *= 0.9;
          if (this.vy < -1) this.vy *= 0.9;
        }

        this.x += this.vx;
        this.y += this.vy;

        // Interaction Física do Rato: Orbitam ou afastam levemente o rato (O Sopro da Vida)
        if (mouse.x >= 0 && mouse.y >= 0 && choreoRef.current === 'idle') {
          const dx = this.x - mouse.x;
          const dy = this.y - mouse.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          
          if (dist < mouseRadius) {
            const force = (mouseRadius - dist) / mouseRadius;
            const pushX = (dx / dist) * force * 1.5;
            const pushY = (dy / dist) * force * 1.5;
            const tangentX = (-dy / dist) * force * 0.8;
            const tangentY = (dx / dist) * force * 0.8;

            this.x += pushX + tangentX;
            this.y += pushY + tangentY;
          }
        }
      }

      draw() {
        ctx!.fillStyle = `rgba(${baseRgb}, 1)`; // 100% sólido/nítido
        ctx!.beginPath(); 
        ctx!.arc(this.x, this.y, this.size, 0, Math.PI * 2); 
        ctx!.fill();
      }
    }

    const init = () => {
      if (!containerRef.current) return;
      particles = [];
      const rect = containerRef.current.getBoundingClientRect();
      const count = window.innerWidth < 768 ? particleCount / 2 : particleCount;
      for (let i = 0; i < count; i++) {
        particles.push(new Particle(rect.width, rect.height, i, count));
      }
    };

    let animationFrameId: number;
    let isVisible = true;
    let startTime = performance.now();

    // A função animate central limpa 100% o canvas, removendo qualquer sensação de "névoa"
    const animate = (timestamp: number) => {
      if (!isVisible || !containerRef.current) return;

      const time = timestamp - startTime;
      const rect = containerRef.current.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;

      // Limpeza Total do Frame
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach((p, i) => {
        p.update(w, h, time);
        p.draw();
        
        let dynDistance = connectionDistance;
        if (choreoRef.current === 'warp') dynDistance *= 1.3;
        if (choreoRef.current === 'align') dynDistance *= 0.8;
        
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dx = p.x - p2.x;
          const dy = p.y - p2.y;
          const d = Math.sqrt(dx * dx + dy * dy);
          
          if (d < dynDistance) {
            const opacity = 1 - (d / dynDistance);
            // Renderização nítida mas estruturada como malha bonita
            ctx.strokeStyle = `rgba(${baseRgb}, ${opacity * 0.85})`; 
            ctx.lineWidth = 0.5; // Fio altamente nítido
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        }
      });
      animationFrameId = requestAnimationFrame(animate);
    };

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
    };
    
    // Suporte tátil para a PWA
    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        const rect = canvas.getBoundingClientRect();
        mouse.x = e.touches[0].clientX - rect.left;
        mouse.y = e.touches[0].clientY - rect.top;
      }
    };

    const handleMouseLeave = () => {
      mouse.x = -1000;
      mouse.y = -1000;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('mouseleave', handleMouseLeave);
    window.addEventListener('touchend', handleMouseLeave);
    window.addEventListener('resize', () => { resize(); init(); });

    // Observador para pauser a animação se o componente não estiver na view
    const observer = new IntersectionObserver((entries) => {
      if (entries.length > 0) {
        const visible = entries[0].isIntersecting;
        if (visible && !isVisible) {
          isVisible = true;
          startTime = performance.now();
          animate(performance.now());
        } else if (!visible && isVisible) {
          isVisible = false;
          cancelAnimationFrame(animationFrameId);
        }
      }
    });
    observer.observe(canvas);

    // Theme Observer para alterar cores dinamicamente sem recarregar o canvas
    const themeObs = new MutationObserver(() => {
      isDark = document.documentElement.classList.contains('dark');
      baseRgb = isDark ? '255, 107, 0' : '0, 93, 232';
    });
    themeObs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

    resize();
    init();
    animate(performance.now());

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
      window.removeEventListener('touchend', handleMouseLeave);
      observer.disconnect();
      themeObs.disconnect();
    };
  }, { scope: containerRef, dependencies: [particleCount, connectionDistance, mouseRadius] });

  return (
    <div ref={containerRef} className={`absolute inset-0 w-full h-full overflow-hidden pointer-events-none ${className}`}>
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="absolute inset-0 z-0 w-full h-full"
      />
    </div>
  );
}
