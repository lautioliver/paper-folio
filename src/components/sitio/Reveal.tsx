"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/cn";

type RevealProps = {
  children: ReactNode;
  className?: string;
};

/**
 * Entrada al hacer scroll con IntersectionObserver: sube 16 px y aparece (clase .revelar).
 * Marca el elemento con data-visible, sin estado de React (no re-renderiza).
 * Con prefers-reduced-motion el CSS lo muestra fijo; sin IntersectionObserver se muestra directo.
 */
export function Reveal({ children, className }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const show = () => {
      element.dataset.visible = "true";
    };
    if (!("IntersectionObserver" in window)) {
      show();
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          show();
          observer.disconnect();
        }
      },
      { threshold: 0.15 },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} data-visible="false" className={cn("revelar", className)}>
      {children}
    </div>
  );
}
