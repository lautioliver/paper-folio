"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { gsap, MOTION_OK } from "@/lib/gsap";

/**
 * Entrada del hero en secuencia (título, texto, botones, ilustración) en menos de 1 s. Anima solo la
 * posición de los elementos con data-hero, sin tocar la opacidad: el HTML del servidor ya los muestra
 * y, si bajaran a 0 al hidratar, parpadearían. Sin JS o con reduced-motion se ven fijos.
 */
export function HeroMotion({ children }: { children: ReactNode }) {
  const scope = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = scope.current;
    if (!root) return;
    const mm = gsap.matchMedia(root);
    mm.add(MOTION_OK, () => {
      gsap.from("[data-hero]", {
        y: 20,
        duration: 0.4,
        stagger: 0.12,
        ease: "power2.out",
        clearProps: "transform",
      });
    });
    return () => mm.revert();
  }, []);

  return (
    <div ref={scope} className="contents">
      {children}
    </div>
  );
}
