"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { gsap, MOTION_OK } from "@/lib/gsap";

type RevealProps = {
  children: ReactNode;
  className?: string;
};

/**
 * Entrada al hacer scroll con GSAP ScrollTrigger: sube 16 px y aparece. Sin JS (o antes de hidratar)
 * el contenido se ve, con prefers-reduced-motion no se crea ninguna animación, y lo que ya está en
 * pantalla al cargar no se anima.
 */
export function Reveal({ children, className }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const mm = gsap.matchMedia();
    mm.add(MOTION_OK, () => {
      if (element.getBoundingClientRect().top < window.innerHeight) return;
      gsap.from(element, {
        opacity: 0,
        y: 16,
        duration: 0.4,
        ease: "power2.out",
        clearProps: "opacity,transform",
        scrollTrigger: { trigger: element, start: "top 85%", once: true },
      });
    });
    return () => mm.revert();
  }, []);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
