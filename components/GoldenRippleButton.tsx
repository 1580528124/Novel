"use client";

import { MouseEvent, ReactNode, useRef, useState } from "react";

type Ripple = {
  id: number;
  x: number;
  y: number;
};

export default function GoldenRippleButton({
  children,
  onClick
}: {
  children: ReactNode;
  onClick?: () => void;
}) {
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const [struck, setStruck] = useState(false);
  const nextId = useRef(0);

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const id = nextId.current;
    nextId.current += 1;
    setRipples((current) => [
      ...current,
      {
        id,
        x: event.clientX - rect.left,
        y: event.clientY - rect.top
      }
    ]);
    setStruck(true);
    window.setTimeout(() => setStruck(false), 260);
    window.setTimeout(() => {
      setRipples((current) => current.filter((ripple) => ripple.id !== id));
    }, 1200);
    onClick?.();
  };

  return (
    <button type="button" className={`golden-ripple-button${struck ? " is-struck" : ""}`} onClick={handleClick}>
      {children}
      {ripples.map((ripple) => (
        <span
          key={ripple.id}
          className="golden-ripple"
          style={{ left: ripple.x, top: ripple.y }}
        />
      ))}
    </button>
  );
}
