import { useRef, useEffect } from 'react';

export type NeuralState = 'idle' | 'align' | 'encrypt' | 'warp' | 'scatter' | 'pulse' | 'flow' | 'focus';

interface NeuralConstellationProps {
  state?: NeuralState;
  onWarpComplete?: (() => void) | undefined;
}

const N = 110;
const LINK_DIST = 140;
const BASE = '45, 212, 191'; // teal-400

type Particle = { x: number; y: number; vx: number; vy: number; r: number };

// Converts a float alpha to "rgba(teal, a)" with explicit string conversion
const teal = (a: number): string => `rgba(${BASE}, ${a.toFixed(3)})`;

function makeParticles(w: number, h: number): Particle[] {
  return Array.from({ length: N }, () => ({
    x: Math.random() * w,
    y: Math.random() * h,
    vx: (Math.random() - 0.5) * 0.45,
    vy: (Math.random() - 0.5) * 0.45,
    r: Math.random() * 1.4 + 0.7,
  }));
}

function ringPos(i: number, cx: number, cy: number, radius: number): { x: number; y: number } {
  const a = (i / N) * Math.PI * 2 - Math.PI / 2;
  return { x: cx + Math.cos(a) * radius, y: cy + Math.sin(a) * radius };
}

// Orbit tiers: radius and angular speed for each tier
const TIER_R: [number, number, number, number] = [45, 78, 110, 143];
const TIER_SPD: [number, number, number, number] = [0.0012, 0.0009, 0.0007, 0.0005];

function runAnimation(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  stateRef: React.MutableRefObject<NeuralState>,
  warpCbRef: React.MutableRefObject<(() => void) | undefined>,
  mouse: { x: number; y: number; vx: number; vy: number },
  reduced: boolean,
): () => void {
  const pts = makeParticles(canvas.width, canvas.height);
  let rafId = 0;
  let prevState: NeuralState = 'idle';
  let warpProgress = 0;
  let scatterFrames = 0;
  let lastTimestamp = performance.now();
  const warpSpeed = 0.96;

  function draw() {
    rafId = requestAnimationFrame(draw);
    if (canvas.width === 0 || canvas.height === 0) return;

    const s = stateRef.current;
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const now = performance.now();
    const deltaSeconds = Math.min((now - lastTimestamp) / 1000, 0.1);
    lastTimestamp = now;

    if (s !== prevState) {
      if (s !== 'warp') warpProgress = 0;
      if (s !== 'scatter') scatterFrames = 0;
      prevState = s;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // ── WARP ──────────────────────────────────────────────────────
    if (s === 'warp') {
      warpProgress = Math.min(1, warpProgress + deltaSeconds * warpSpeed);
      const alpha = 1 - warpProgress;
      for (const p of pts) {
        const dx = p.x - cx;
        const dy = p.y - cy;
        const d = Math.sqrt(dx * dx + dy * dy) || 1;
        const speed = 1.5 + d * 0.1 * warpProgress * 3;
        p.x += (dx / d) * speed;
        p.y += (dy / d) * speed;
        ctx.strokeStyle = teal(alpha * 0.35);
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(cx + dx * 0.2, cy + dy * 0.2);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
        ctx.fillStyle = teal(alpha);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * (1 + warpProgress * 2), 0, Math.PI * 2);
        ctx.fill();
      }
      if (warpProgress >= 1 && warpCbRef.current) {
        const cb = warpCbRef.current;
        warpCbRef.current = undefined;
        cb();
      }
      return;
    }

    // ── IDLE ──────────────────────────────────────────────────────
    if (s === 'idle') {
      for (let i = 0; i < N; i++) {
        for (let j = i + 1; j < N; j++) {
          const pi = pts[i] as Particle;
          const pj = pts[j] as Particle;
          const dx = pi.x - pj.x;
          const dy = pi.y - pj.y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < LINK_DIST) {
            ctx.strokeStyle = teal((1 - d / LINK_DIST) * 0.28);
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(pi.x, pi.y);
            ctx.lineTo(pj.x, pj.y);
            ctx.stroke();
          }
        }
      }
      for (const p of pts) {
        if (!reduced) {
          p.x += p.vx;
          p.y += p.vy;
          if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
          if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
          const dx = p.x - mouse.x;
          const dy = p.y - mouse.y;
          const d = Math.sqrt(dx * dx + dy * dy);
          const mouseSpeed = Math.sqrt(mouse.vx * mouse.vx + mouse.vy * mouse.vy);
          if (d < 130 && d > 0) {
            if (mouseSpeed > 3) {
              const f = ((130 - d) / 130) * 2.5;
              p.x += (dx / d) * f;
              p.y += (dy / d) * f;
            } else {
              // Slow/stopped cursor: orbit
              p.x += (-dy / d) * 0.6;
              p.y += (dx / d) * 0.6;
            }
          }
        }
        ctx.fillStyle = teal(0.85);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      return;
    }

    // ── ALIGN (email focus) ──────────────────────────────────────
    if (s === 'align') {
      const radius = Math.min(cx, cy) * 0.55;
      for (let i = 0; i < N; i++) {
        const p = pts[i] as Particle;
        const target = ringPos(i, cx, cy, radius);
        p.x += (target.x - p.x) * 0.055;
        p.y += (target.y - p.y) * 0.055;
      }
      // Ring edges
      for (let i = 0; i < N; i++) {
        const a = pts[i] as Particle;
        const b = pts[(i + 1) % N] as Particle;
        ctx.strokeStyle = teal(0.3);
        ctx.lineWidth = 0.6;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
        // Diametric helix cross-links
        if (i < Math.floor(N / 2)) {
          const opp = pts[i + Math.floor(N / 2)] as Particle;
          ctx.strokeStyle = teal(0.07);
          ctx.lineWidth = 0.4;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(opp.x, opp.y);
          ctx.stroke();
        }
      }
      for (let i = 0; i < N; i++) {
        const p = pts[i] as Particle;
        ctx.fillStyle = teal(0.9);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * 1.15, 0, Math.PI * 2);
        ctx.fill();
      }
      return;
    }

    // ── ENCRYPT (password focus) ─────────────────────────────────
    if (s === 'encrypt') {
      for (let ti = 0; ti < TIER_R.length; ti++) {
        const r = TIER_R[ti] as number;
        const spd = TIER_SPD[ti] as number;
        ctx.strokeStyle = teal(0.07);
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();
        for (let k = 0; k < 12; k++) {
          const ang = (k / 12) * Math.PI * 2 + now * spd;
          ctx.strokeStyle = teal(0.15);
          ctx.lineWidth = 0.5;
          ctx.beginPath();
          ctx.moveTo(cx + Math.cos(ang) * (r - 4), cy + Math.sin(ang) * (r - 4));
          ctx.lineTo(cx + Math.cos(ang) * (r + 4), cy + Math.sin(ang) * (r + 4));
          ctx.stroke();
        }
      }
      for (let i = 0; i < N; i++) {
        const p = pts[i] as Particle;
        const tier = (i % 4) as 0 | 1 | 2 | 3;
        const r = TIER_R[tier];
        const spd = TIER_SPD[tier];
        const ang = ((i / N) * Math.PI * 2) + now * spd;
        const tx = cx + Math.cos(ang) * r;
        const ty = cy + Math.sin(ang) * r;
        p.x += (tx - p.x) * 0.09;
        p.y += (ty - p.y) * 0.09;
        const dist = Math.sqrt((p.x - cx) ** 2 + (p.y - cy) ** 2);
        const alpha = Math.max(0.25, 1 - dist / 180);
        ctx.fillStyle = teal(alpha);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      return;
    }

    // ── PULSE (nome — partículas expandem em ondas suaves) ────────
    if (s === 'pulse') {
      const t = now * 0.001;
      for (let i = 0; i < N; i++) {
        const p = pts[i] as Particle;
        const wave = Math.sin(t * 1.8 + i * 0.18) * 18;
        const angle = (i / N) * Math.PI * 2;
        const r = Math.min(cx, cy) * 0.38 + wave;
        const tx = cx + Math.cos(angle) * r;
        const ty = cy + Math.sin(angle) * r;
        p.x += (tx - p.x) * 0.04;
        p.y += (ty - p.y) * 0.04;
        ctx.fillStyle = teal(0.7 + Math.sin(t * 2 + i * 0.2) * 0.3);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * (1 + Math.abs(Math.sin(t + i * 0.15)) * 0.6), 0, Math.PI * 2);
        ctx.fill();
      }
      for (let i = 0; i < N; i += 3) {
        const a = pts[i] as Particle;
        const b = pts[(i + 5) % N] as Particle;
        ctx.strokeStyle = teal(0.18);
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
      return;
    }

    // ── FLOW (área/select — partículas fluem em espiral) ──────────
    if (s === 'flow') {
      const t = now * 0.001;
      for (let i = 0; i < N; i++) {
        const p = pts[i] as Particle;
        const prog = i / N;
        const spiralR = 20 + prog * Math.min(cx, cy) * 0.7;
        const angle = prog * Math.PI * 6 + t * 0.5;
        const tx = cx + Math.cos(angle) * spiralR;
        const ty = cy + Math.sin(angle) * spiralR;
        p.x += (tx - p.x) * 0.05;
        p.y += (ty - p.y) * 0.05;
        ctx.fillStyle = teal(0.5 + prog * 0.5);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * (0.8 + prog * 0.6), 0, Math.PI * 2);
        ctx.fill();
      }
      for (let i = 0; i < N - 1; i++) {
        const a = pts[i] as Particle;
        const b = pts[i + 1] as Particle;
        ctx.strokeStyle = teal(0.12);
        ctx.lineWidth = 0.4;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
      return;
    }

    // ── FOCUS (confirm password — dois anéis convergem) ───────────
    if (s === 'focus') {
      const t = now * 0.001;
      const r1 = Math.min(cx, cy) * 0.35;
      const r2 = Math.min(cx, cy) * 0.6;
      for (let i = 0; i < N; i++) {
        const p = pts[i] as Particle;
        const inner = i < N / 2;
        const r = inner ? r1 : r2;
        const spd = inner ? 0.0014 : -0.0009;
        const idx = inner ? i : i - N / 2;
        const angle = (idx / (N / 2)) * Math.PI * 2 + now * spd;
        const tx = cx + Math.cos(angle) * r;
        const ty = cy + Math.sin(angle) * r;
        p.x += (tx - p.x) * 0.08;
        p.y += (ty - p.y) * 0.08;
        const brightness = Math.abs(Math.sin(t * 2.5 + i * 0.1));
        ctx.fillStyle = teal(0.5 + brightness * 0.5);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * (1 + brightness * 0.4), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.strokeStyle = teal(0.06);
      ctx.lineWidth = 0.5;
      ctx.beginPath(); ctx.arc(cx, cy, r1, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(cx, cy, r2, 0, Math.PI * 2); ctx.stroke();
      return;
    }

    // ── SCATTER (failure) ────────────────────────────────────────
    scatterFrames++;
    for (let i = 0; i < N; i++) {
      for (let j = i + 1; j < N; j++) {
        const pi = pts[i] as Particle;
        const pj = pts[j] as Particle;
        const dx = pi.x - pj.x;
        const dy = pi.y - pj.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < LINK_DIST) {
          ctx.strokeStyle = `rgba(130, 130, 140, ${((1 - d / LINK_DIST) * 0.2).toFixed(3)})`;
          ctx.lineWidth = 0.4;
          ctx.beginPath();
          ctx.moveTo(pi.x, pi.y);
          ctx.lineTo(pj.x, pj.y);
          ctx.stroke();
        }
      }
    }
    for (const p of pts) {
      if (scatterFrames < 70) {
        p.vx += (Math.random() - 0.5) * 1.8;
        p.vy += (Math.random() - 0.5) * 1.8;
      }
      p.vx *= 0.93;
      p.vy *= 0.93;
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 0) { p.vx = Math.abs(p.vx); p.x = 0; }
      if (p.x > canvas.width) { p.vx = -Math.abs(p.vx); p.x = canvas.width; }
      if (p.y < 0) { p.vy = Math.abs(p.vy); p.y = 0; }
      if (p.y > canvas.height) { p.vy = -Math.abs(p.vy); p.y = canvas.height; }
      ctx.fillStyle = `rgba(110, 110, 120, 0.550)`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }


  draw();
  return () => { cancelAnimationFrame(rafId); };
}

export function NeuralConstellation({ state = 'idle', onWarpComplete }: NeuralConstellationProps): React.JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<NeuralState>(state);
  const warpCbRef = useRef(onWarpComplete);

  useEffect(() => { stateRef.current = state; }, [state]);
  useEffect(() => { warpCbRef.current = onWarpComplete; }, [onWarpComplete]);

  useEffect(() => {
    const el = canvasRef.current;
    if (el === null) return;
    const rawCtx = el.getContext('2d');
    if (rawCtx === null) return;

    // Typed aliases — TypeScript sees these as non-null in all closures
    const canvas: HTMLCanvasElement = el;
    const ctx: CanvasRenderingContext2D = rawCtx;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const mouse = { x: -999, y: -999, vx: 0, vy: 0 };

    const stop = runAnimation(canvas, ctx, stateRef, warpCbRef, mouse, reduced);

    const onMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const nx = e.clientX - rect.left;
      const ny = e.clientY - rect.top;
      mouse.vx = nx - mouse.x;
      mouse.vy = ny - mouse.y;
      mouse.x = nx;
      mouse.y = ny;
    };
    const onMouseLeave = () => { mouse.x = -999; mouse.y = -999; mouse.vx = 0; mouse.vy = 0; };

    const ro = new ResizeObserver(([entry]) => {
      if (!entry) return;
      const { width, height } = entry.contentRect;
      if (width === 0 || height === 0) return;
      canvas.width = width;
      canvas.height = height;
    });

    const parent = canvas.parentElement;
    if (parent) {
      canvas.width = parent.offsetWidth;
      canvas.height = parent.offsetHeight;
      ro.observe(parent);
    }

    window.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('mouseleave', onMouseLeave);

    return () => {
      stop();
      ro.disconnect();
      window.removeEventListener('mousemove', onMouseMove);
      canvas.removeEventListener('mouseleave', onMouseLeave);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
      aria-hidden="true"
    />
  );
}
