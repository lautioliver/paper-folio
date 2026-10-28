"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { gsap, ScrollTrigger, MOTION_OK } from "@/lib/gsap";

/**
 * Lista de hitos que marca como activo (data-activo) el que está en la línea central de la pantalla (una sola línea de referencia: los rangos de dos hitos nunca se pisan)
 * mientras se baja. El estilo lo pone cada hito con `group-data-[activo=true]`. Marcar el activo es un cambio
 * de estado sin movimiento, pero se hace solo con MOTION_OK: con reduced-motion la lista queda quieta.
 */
export function ResaltarHitos({ children, className }: { children: ReactNode; className?: string }) {
  const lista = useRef<HTMLOListElement>(null);

  useEffect(() => {
    const root = lista.current;
    if (!root) return;
    const mm = gsap.matchMedia();
    mm.add(MOTION_OK, () => {
      const triggers = Array.from(root.children).map((hito) =>
        ScrollTrigger.create({
          trigger: hito,
          start: "top center",
          end: "bottom center",
          onToggle: (self) => {
            if (self.isActive) (hito as HTMLElement).dataset.activo = "true";
            else delete (hito as HTMLElement).dataset.activo;
          },
        }),
      );
      return () => {
        triggers.forEach((trigger) => trigger.kill());
        Array.from(root.children).forEach((hito) => delete (hito as HTMLElement).dataset.activo);
      };
    });
    return () => mm.revert();
  }, []);

  return (
    <ol ref={lista} className={className}>
      {children}
    </ol>
  );
}
