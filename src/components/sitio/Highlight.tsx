import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Marcador } from "./Marcador";
import { TONE_BG, TONE_TEXT, type Tone } from "./tones";

type HighlightProps = {
  children: ReactNode;
  tone: Tone;
};

/** Bloque de color plano detrás de una o dos palabras de un título (manual: resaltado), que se pinta al entrar. */
export function Highlight({ children, tone }: HighlightProps) {
  return <Marcador className={cn("box-decoration-clone px-2", TONE_BG[tone], TONE_TEXT[tone])}>{children}</Marcador>;
}

type SectionTitleProps = {
  children: ReactNode;
  className?: string;
};

/** Título de sección (h2): 28 px en celular, 36 px desde tablet (manual: tipografía). */
export function SectionTitle({ children, className }: SectionTitleProps) {
  return <h2 className={cn("text-[1.75rem] leading-[1.15] font-bold sm:text-h2", className)}>{children}</h2>;
}
