"use client";

import { useEffect, useRef } from "react";
import { gsap, MOTION_OK } from "@/lib/gsap";
import { valorEnProgreso } from "@/lib/conteo";

/**
 * Número que sube de 0 al valor real cuando entra en pantalla. El HTML del servidor ya trae el valor final
 * (sin JS o con prefers-reduced-motion se ve fijo) y un lector de pantalla siempre lee el valor real: lo
 * que se anima es una copia aria-hidden.
 */
export function ContadorNumero({ valor }: { valor: number }) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const element = ref.current;
    const texto = element?.firstChild;
    if (!element || !texto) return;
    const mm = gsap.matchMedia();
    mm.add(MOTION_OK, () => {
      const estado = { progreso: 0 };
      gsap.to(estado, {
        progreso: 1,
        duration: 1.2,
        ease: "power2.out",
        onStart: () => {
          texto.nodeValue = "0";
        },
        onUpdate: () => {
          texto.nodeValue = String(valorEnProgreso(valor, estado.progreso));
        },
        scrollTrigger: { trigger: element, start: "top 90%", once: true },
      });
      return () => {
        texto.nodeValue = String(valor);
      };
    });
    return () => mm.revert();
  }, [valor]);

  return (
    <>
      <span ref={ref} aria-hidden="true">
        {valor}
      </span>
      <span className="sr-only">{valor}</span>
    </>
  );
}
