"use client";

import { useEffect, useRef } from "react";

export default function DragonScaleBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    const scaleWidth = 72;
    const scaleHeight = 42;

    const drawScale = (x: number, y: number, opacity: number) => {
      context.beginPath();
      context.moveTo(x, y);
      context.quadraticCurveTo(x - scaleWidth * 0.5, y + scaleHeight * 0.68, x, y + scaleHeight);
      context.quadraticCurveTo(x + scaleWidth * 0.5, y + scaleHeight * 0.68, x, y);
      context.strokeStyle = `rgba(201, 169, 110, ${opacity})`;
      context.lineWidth = 0.8;
      context.shadowBlur = 4;
      context.shadowColor = `rgba(201, 169, 110, ${opacity * 0.9})`;
      context.stroke();
      context.shadowBlur = 0;
    };

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const width = window.innerWidth;
      const height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      context.clearRect(0, 0, width, height);

      const cols = Math.ceil(width / scaleWidth) + 2;
      const rows = Math.ceil(height / scaleHeight) + 2;
      const maxDistance = Math.hypot(width / 2, height / 2);

      for (let row = 0; row < rows; row += 1) {
        for (let col = 0; col < cols; col += 1) {
          const x = col * scaleWidth + (row % 2) * (scaleWidth / 2) - scaleWidth;
          const y = row * scaleHeight * 0.78 - scaleHeight;
          const distance = Math.hypot(x - width / 2, y - height / 2);
          const opacity = 0.018 + 0.055 * (1 - distance / maxDistance);
          drawScale(x, y, Math.max(0.012, opacity));
        }
      }
    };

    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  return <canvas ref={canvasRef} className="dragon-scale-background" aria-hidden="true" />;
}
