"use client";

import { useEffect, useRef } from "react";

type Particle = {
  angle: number;
  radius: number;
  size: number;
  speed: number;
  offset: number;
  alpha: number;
};

export default function SGradeBadge({ variant = "s" }: { variant?: "s" | "emblem" }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    let frame = 0;
    const size = 300;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    context.scale(dpr, dpr);

    const particles: Particle[] = Array.from({ length: 72 }, (_, index) => {
      const layer = Math.floor(index / 24);
      return {
        angle: Math.random() * Math.PI * 2,
        radius: 78 + layer * 25 + Math.random() * 8,
        size: 1.35 + Math.random() * 2.4,
        speed: 0.006 + Math.random() * 0.009 + layer * 0.0022,
        offset: Math.random() * 100,
        alpha: 0.28 + Math.random() * 0.46
      };
    });

    const render = () => {
      const center = size / 2;
      context.clearRect(0, 0, size, size);

      particles.forEach((particle) => {
        particle.angle += particle.speed;
        const orbitAngle = particle.angle + particle.offset;
        const x = center + Math.cos(orbitAngle) * particle.radius;
        const y = center + Math.sin(orbitAngle) * particle.radius * 0.94;
        const alpha = particle.alpha * (0.72 + 0.28 * Math.sin(performance.now() * 0.0018 + particle.offset));
        const glow = context.createRadialGradient(x, y, 0, x, y, particle.size * 4.2);

        glow.addColorStop(0, `rgba(255, 230, 170, ${alpha})`);
        glow.addColorStop(0.45, `rgba(201, 169, 110, ${alpha * 0.46})`);
        glow.addColorStop(1, "rgba(201, 169, 110, 0)");

        context.beginPath();
        context.arc(x, y, particle.size * 4.2, 0, Math.PI * 2);
        context.fillStyle = glow;
        context.fill();
      });

      const coreGlow = context.createRadialGradient(center, center, 14, center, center, 104);
      coreGlow.addColorStop(0, "rgba(201, 169, 110, 0.035)");
      coreGlow.addColorStop(1, "rgba(201, 169, 110, 0)");
      context.fillStyle = coreGlow;
      context.fillRect(0, 0, size, size);

      frame = requestAnimationFrame(render);
    };

    frame = requestAnimationFrame(render);
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <div className={`s-grade-badge${variant === "emblem" ? " is-emblem" : ""}`} aria-hidden="true">
      <canvas ref={canvasRef} />
      {variant === "emblem" ? <img src="/cassell-emblem.png" alt="" /> : <strong>S</strong>}
    </div>
  );
}
