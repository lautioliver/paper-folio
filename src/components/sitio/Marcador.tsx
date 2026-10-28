"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { gsap, MOTION_OK } from "@/lib/gsap";

/**
 * Marcador de un título: al entrar en pantalla se "pinta" de izquierda a derecha (clip-path sobre el
 * resaltado y su texto juntos, así el texto nunca queda blanco sobre blanco). Lo que ya está en pantalla
 * al cargar espera a que entren las palabras del hero. Sin JS o con reduced-motion se ve pintado.
 */
export function Marcador({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const mm = gsap.matchMedia();
    mm.add(MOTION_OK, () => {
      const enPantalla = element.getBoundingClientRect().top < window.innerHeight;
      gsap.from(element, {
        clipPath: "inset(0 100% 0 0)",
        duration: 0.6,
        delay: enPantalla ? 0.5 : 0,
        ease: "power2.out",
        clearProps: "clipPath",
        scrollTrigger: { trigger: element, start: "top 90%", once: true },
      });
    });
    return () => mm.revert();
  }, []);

  return (
    <span ref={ref} className={className}>
      {children}
    </span>
  );
}
