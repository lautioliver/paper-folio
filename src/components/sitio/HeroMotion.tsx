"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { gsap, MOTION_OK } from "@/lib/gsap";

/**
 * Entrada del hero: el título palabra por palabra y después texto, botones e ilustración (poco más de 1 s).
 * Anima solo posición, sin tocar la opacidad: el HTML del servidor ya los muestra y, si bajaran a 0 al
 * hidratar, parpadearían. Después el personaje flota en loop y, al bajar, se mueve más lento que la
 * página (parallax). La capa [data-hero-escala] lo agranda lo justo para que el movimiento no deje bordes.
 * Sin JS o con reduced-motion se ve fijo.
 */
export function HeroMotion({ children }: { children: ReactNode }) {
  const scope = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = scope.current;
    if (!root) return;
    const mm = gsap.matchMedia(root);
    mm.add(MOTION_OK, () => {
      gsap
        .timeline({ defaults: { ease: "power2.out", clearProps: "transform" } })
        .from("[data-palabra]", { y: 24, duration: 0.45, stagger: 0.04 })
        .from("[data-hero]", { y: 20, duration: 0.4, stagger: 0.12 }, "-=0.3");
      gsap.set("[data-hero-escala]", { scale: 1.16 });
      gsap.fromTo(
        "[data-hero-flota]",
        { y: -6 },
        { y: 6, duration: 2.4, ease: "sine.inOut", yoyo: true, repeat: -1 },
      );
      gsap.to("[data-hero-parallax]", {
        y: 16,
        ease: "none",
        scrollTrigger: { start: 0, end: "+=500", scrub: true },
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
