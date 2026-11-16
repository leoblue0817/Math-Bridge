import { useEffect, useRef } from 'react';

export function StarfieldCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let animationId = 0;

    interface Star {
      x: number;
      y: number;
      r: number;
      alpha: number;
      delta: number;
      vy: number;
    }

    let stars: Star[] = [];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      stars = Array.from({ length: 120 }, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        r: Math.random() * 1.4 + 0.3,
        alpha: Math.random() * 0.65 + 0.2,
        delta: (Math.random() - 0.5) * 0.012,
        vy: Math.random() * 0.14 + 0.04,
      }));
    };

    const drawFrame = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const star of stars) {
        if (!prefersReducedMotion) {
          star.alpha += star.delta;
          if (star.alpha < 0.15 || star.alpha > 0.85) star.delta *= -1;
          star.y += star.vy;
          if (star.y > canvas.height) {
            star.y = 0;
            star.x = Math.random() * canvas.width;
          }
        }
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(226, 232, 240, ${star.alpha})`;
        ctx.fill();
      }
      if (!prefersReducedMotion) {
        animationId = requestAnimationFrame(drawFrame);
      }
    };

    window.addEventListener('resize', resize);
    resize();
    drawFrame();

    return () => {
      window.removeEventListener('resize', resize);
      if (animationId) cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0"
    />
  );
}
