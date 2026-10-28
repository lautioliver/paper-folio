"use client";

import { useEffect, useRef } from "react";
import { gsap, MOTION_OK } from "@/lib/gsap";

/** Aviso de consulta enviada: la tilde "salta" y el texto se desliza. Con reduced-motion se ve fijo. */
export function ExitoEnvio() {
  const scope = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const root = scope.current;
    if (!root) return;
    const mm = gsap.matchMedia(root);
    mm.add(MOTION_OK, () => {
      gsap.from("[data-tilde]", { scale: 0, rotate: -30, duration: 0.5, ease: "back.out(2)", clearProps: "transform" });
      gsap.from("[data-texto]", { x: -12, opacity: 0, duration: 0.4, delay: 0.15, ease: "power2.out", clearProps: "transform,opacity" });
    });
    return () => mm.revert();
  }, []);

  return (
    <span ref={scope} className="inline-flex items-center gap-2">
      <span data-tilde aria-hidden="true" className="grid size-7 place-items-center rounded-full border-2 border-tinta bg-primario">
        <svg viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 8.5l3.2 3L13 4.5" />
        </svg>
      </span>
      <span data-texto>¡Gracias! Te respondo por email.</span>
    </span>
  );
}
