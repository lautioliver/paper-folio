"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { gsap, MOTION_OK } from "@/lib/gsap";

/**
 * Barra fina de progreso de lectura arriba de todo: crece con el scroll de la página (transform, sin layout).
 * Es decorativa (aria-hidden), no recibe clics ni foco, y con reduced-motion no se crea. Vive en el layout, que
 * no se vuelve a montar al navegar: se rearma con cada ruta, así el largo ("max") es el de la página nueva.
 */
export function ProgresoLectura() {
  const barra = useRef<HTMLDivElement>(null);
  const ruta = usePathname();

  useEffect(() => {
    const element = barra.current;
    if (!element) return;
    const mm = gsap.matchMedia();
    mm.add(MOTION_OK, () => {
      gsap.to(element, {
        scaleX: 1,
        ease: "none",
        scrollTrigger: { start: 0, end: "max", scrub: true },
      });
    });
    return () => mm.revert();
  }, [ruta]);

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-x-0 top-0 z-50 h-2">
      <div ref={barra} className="h-full origin-left scale-x-0 border-b-2 border-tinta bg-primario" />
    </div>
  );
}
