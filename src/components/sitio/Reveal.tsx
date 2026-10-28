"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { gsap, MOTION_OK } from "@/lib/gsap";

type RevealProps = {
  children: ReactNode;
  className?: string;
  /** Segundos de espera antes de entrar: escalona tarjetas hermanas. */
  retraso?: number;
};

/**
 * Entrada al hacer scroll con GSAP ScrollTrigger: sube 16 px y aparece. Sin JS (o antes de hidratar)
 * el contenido se ve, con prefers-reduced-motion no se crea ninguna animación, y lo que ya está en
 * pantalla al cargar no se anima. Los hijos con `data-escalon` entran uno tras otro después de la tarjeta.
 */
export function Reveal({ children, className, retraso = 0 }: RevealProps) {
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
        delay: retraso,
        ease: "power2.out",
        clearProps: "opacity,transform",
        scrollTrigger: { trigger: element, start: "top 85%", once: true },
      });
      const piezas = element.querySelectorAll("[data-escalon]");
      if (piezas.length === 0) return;
      gsap.from(piezas, {
        opacity: 0,
        y: 12,
        duration: 0.4,
        stagger: 0.07,
        delay: retraso + 0.2,
        ease: "power2.out",
        clearProps: "opacity,transform",
        scrollTrigger: { trigger: element, start: "top 85%", once: true },
      });
    });
    return () => mm.revert();
  }, [retraso]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
