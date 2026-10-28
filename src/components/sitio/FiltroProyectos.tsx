"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { categoriasDe, filtrarPorCategoria } from "@/lib/filtro-proyectos";
import { gsap, MOTION_OK, ScrollTrigger } from "@/lib/gsap";

type Item = { slug: string; categoria: string; tarjeta: ReactNode };

const CHIP = "apretable contorno min-h-11 px-4 py-2 text-pequeno font-bold";

/**
 * Listado de proyectos con filtro por categoría. Las tarjetas llegan armadas desde el servidor; acá solo se
 * elige cuáles se muestran. Al filtrar, las que quedan entran en secuencia (solo con MOTION_OK). Sin JS se ven todas.
 */
export function FiltroProyectos({ items }: { items: Item[] }) {
  const [categoria, setCategoria] = useState<string | null>(null);
  const lista = useRef<HTMLUListElement>(null);
  const anterior = useRef(categoria);
  const categorias = categoriasDe(items);
  const visibles = filtrarPorCategoria(items, categoria);

  useEffect(() => {
    // Compara con la categoría anterior (no con un "primer render"): StrictMode corre el efecto dos veces al montar.
    if (anterior.current === categoria) return;
    anterior.current = categoria;
    // La lista cambió de alto: los Reveal que faltan mostrarse recalculan dónde se disparan.
    ScrollTrigger.refresh();
    const root = lista.current;
    if (!root) return;
    const mm = gsap.matchMedia(root);
    mm.add(MOTION_OK, () => {
      gsap.from(root.children, { opacity: 0, y: 16, duration: 0.35, stagger: 0.08, ease: "power2.out", clearProps: "opacity,transform" });
    });
    return () => mm.revert();
  }, [categoria]);

  return (
    <>
      {categorias.length > 1 && (
        <div role="group" aria-label="Filtrar por categoría" className="mt-8 flex flex-wrap justify-center gap-3">
          {[null, ...categorias].map((valor) => (
            <button
              key={valor ?? "todos"}
              type="button"
              aria-pressed={categoria === valor}
              onClick={() => setCategoria(valor)}
              className={cn(CHIP, categoria === valor ? "elegido bg-primario" : "bg-papel")}
            >
              {valor ?? "Todos"}
            </button>
          ))}
        </div>
      )}
      <p role="status" className="sr-only">
        {visibles.length === 1 ? "Mostrando 1 proyecto" : `Mostrando ${visibles.length} proyectos`}
      </p>
      <ul ref={lista} className="mt-12 grid gap-8">
        {visibles.map((item) => (
          <li key={item.slug}>{item.tarjeta}</li>
        ))}
      </ul>
    </>
  );
}
