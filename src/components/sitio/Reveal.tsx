"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/cn";

type RevealProps = {
  children: ReactNode;
  className?: string;
};

/**
 * Entrada al hacer scroll: sube 16 px y aparece. Sin JS (o antes de hidratar) el contenido se ve:
 * solo lo que está debajo de la pantalla al cargar se oculta (data-visible="false") y se muestra
 * con IntersectionObserver. Marca el elemento por dataset, sin estado de React.
 */
export function Reveal({ children, className }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element || !("IntersectionObserver" in window)) return;
    if (element.getBoundingClientRect().top < window.innerHeight) return;
    element.dataset.visible = "false";
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          element.dataset.visible = "true";
          observer.disconnect();
        }
      },
      { threshold: 0.15 },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className={cn("revelar", className)}>
      {children}
    </div>
  );
}
