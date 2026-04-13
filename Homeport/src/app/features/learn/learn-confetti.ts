/**
 * Lightweight confetti burst.
 * Creates a temporary <canvas>, fires ~60 particles, removes itself after 1.5s.
 */
export function launchConfetti(targetEl?: HTMLElement): void {
  const rect = targetEl?.getBoundingClientRect();
  const cx = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
  const cy = rect ? rect.top + rect.height / 2 : window.innerHeight / 2;

  const canvas = document.createElement('canvas');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  canvas.style.cssText = 'position:fixed;top:0;left:0;pointer-events:none;z-index:10000';
  document.body.appendChild(canvas);

  const ctx = canvas.getContext('2d')!;
  const colors = ['#e61982', '#52c41a', '#faad14', '#ff4d4f', '#722ed1', '#13c2c2'];
  const particles: Particle[] = [];
  const count = 60;

  interface Particle { x: number; y: number; vx: number; vy: number; w: number; h: number; color: string; rotation: number; rv: number; alpha: number; }

  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 3 + Math.random() * 6;
    particles.push({
      x: cx, y: cy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 3,
      w: 4 + Math.random() * 4,
      h: 6 + Math.random() * 6,
      color: colors[Math.floor(Math.random() * colors.length)],
      rotation: Math.random() * Math.PI * 2,
      rv: (Math.random() - 0.5) * 0.3,
      alpha: 1,
    });
  }

  let frame: number;
  const start = performance.now();

  function tick(now: number) {
    const elapsed = now - start;
    if (elapsed > 1500) {
      cancelAnimationFrame(frame);
      canvas.remove();
      return;
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const p of particles) {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.15; // gravity
      p.rotation += p.rv;
      p.alpha = Math.max(0, 1 - elapsed / 1500);
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    }
    frame = requestAnimationFrame(tick);
  }

  frame = requestAnimationFrame(tick);
}
