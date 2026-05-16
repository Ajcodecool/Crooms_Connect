import type { RefObject } from 'react';

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  alpha: number;
}

export const runFireworks = (
  canvas: HTMLCanvasElement,
  particlesRef: RefObject<Particle[]>,
  animationFrameRef: RefObject<number | null>,
): void => {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  if (
    canvas.width !== window.innerWidth ||
    canvas.height !== window.innerHeight
  ) {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  if (particlesRef.current.length > 1000) return;

  let burstCount = 0;
  const burstInterval = setInterval(() => {
    const explosionCount = Math.floor(Math.random() * 2) + 2;

    for (let k = 0; k < explosionCount; k++) {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height * 0.6;
      const color = `hsl(${Math.random() * 360}, 100%, 50%)`;

      for (let p = 0; p < 40; p++) {
        const angle = Math.random() * Math.PI * 2;
        const velocity = Math.random() * 4 + 2;
        particlesRef.current.push({
          x: x,
          y: y,
          vx: Math.cos(angle) * velocity,
          vy: Math.sin(angle) * velocity,
          life: 120 + Math.random() * 60,
          color: color,
          alpha: 1,
        });
      }
    }

    burstCount++;
    if (burstCount >= 10) clearInterval(burstInterval);
  }, 500);

  if (!animationFrameRef.current) {
    const animate = (): void => {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.globalCompositeOperation = 'lighter';

      for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        const p = particlesRef.current[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.05;
        p.life--;
        p.alpha -= 0.005;

        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
        ctx.fill();

        if (p.life <= 0 || p.alpha <= 0) particlesRef.current.splice(i, 1);
      }

      if (particlesRef.current.length > 0 || burstCount < 10) {
        animationFrameRef.current = requestAnimationFrame(animate);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        animationFrameRef.current = null;
      }
    };
    animate();
  }
};
