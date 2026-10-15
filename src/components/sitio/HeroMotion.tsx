"use client";

import { useEffect } from "react";
import { gsap, MOTION_OK } from "@/lib/gsap";

/**
 * Entrada del hero en secuencia (título, texto, botones, ilustración) en menos de 1 s. No renderiza
 * nada: anima los elementos con data-hero de #inicio. Sin JS o con reduced-motion se ven fijos.
 */
export function HeroMotion() {
  useEffect(() => {
    const targets = gsap.utils.toArray<HTMLElement>("#inicio [data-hero]");
    if (targets.length === 0) return;
    const mm = gsap.matchMedia();
    mm.add(MOTION_OK, () => {
      gsap.from(targets, {
        opacity: 0,
        y: 20,
        duration: 0.4,
        stagger: 0.12,
        ease: "power2.out",
        clearProps: "opacity,transform",
      });
    });
    return () => mm.revert();
  }, []);

  return null;
}
