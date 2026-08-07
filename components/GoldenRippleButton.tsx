"use client";

import { ReactNode, useRef, useState } from "react";

type Ripple = {
  id: number;
};

export default function GoldenRippleButton({
  children,
  onClick,
  disabled = false
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const [struck, setStruck] = useState(false);
  const nextId = useRef(0);

  const handleClick = () => {
    if (disabled) return;

    const id = nextId.current;
    nextId.current += 1;
    setRipples((current) => [
      ...current,
      { id }
    ]);
    setStruck(true);
    window.setTimeout(() => setStruck(false), 260);
    window.setTimeout(() => {
      setRipples((current) => current.filter((ripple) => ripple.id !== id));
    }, 1200);
    onClick?.();
  };

  return (
    <button
      type="button"
      className={`golden-ripple-button${struck ? " is-struck" : ""}`}
      onClick={handleClick}
      disabled={disabled}
    >
      {children}
      {ripples.map((ripple) => (
        <span key={ripple.id} className="golden-ripple" />
      ))}
    </button>
  );
}
