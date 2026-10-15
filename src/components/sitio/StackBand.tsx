"use client";

import { useState } from "react";
import { stack } from "@/content/profile";
import { cn } from "@/lib/cn";
import { TONE_BG, type Tone } from "./tones";

const DOTS: Tone[] = ["primario", "acento", "secundario", "terciario"];

/**
 * Banda inclinada con el stack en movimiento continuo. Se pausa con el botón o con el hover
 * (WCAG 2.2.2: lo que se mueve más de 5 s se puede detener) y queda fija con reduced-motion.
 */
export function StackBand() {
  const [paused, setPaused] = useState(false);
  const items = [...stack, ...stack];
  return (
    <section id="stack" aria-label="Stack" className="overflow-hidden py-10">
      <div className="banda -mx-8 -rotate-3 bg-tinta py-4" data-pausada={paused}>
        <ul className="banda-pista flex w-max gap-12 pl-12">
          {items.map((tech, i) => (
            <li
              key={`${tech}-${i}`}
              aria-hidden={i >= stack.length}
              className="flex items-center gap-3 text-h3 font-bold whitespace-nowrap text-papel"
            >
              <span className={cn("size-3 rounded-full", TONE_BG[DOTS.at(i % DOTS.length) ?? "primario"])} />
              {tech}
            </li>
          ))}
        </ul>
      </div>
      <div className="mt-6 flex justify-end px-4 sm:px-6">
        <button
          type="button"
          aria-pressed={paused}
          onClick={() => setPaused((value) => !value)}
          className="rounded-lg px-3 py-2 text-pequeno font-bold underline decoration-2 underline-offset-4"
        >
          {paused ? "Reanudar animación" : "Pausar animación"}
        </button>
      </div>
    </section>
  );
}
