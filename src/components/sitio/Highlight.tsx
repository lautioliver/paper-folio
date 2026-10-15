import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

const TONES = {
  primario: "bg-primario text-tinta",
  acento: "bg-acento text-tinta",
  secundario: "bg-secundario text-papel",
  terciario: "bg-terciario text-papel",
} as const;

type HighlightProps = {
  children: ReactNode;
  tone: keyof typeof TONES;
};

/** Bloque de color plano detrás de una o dos palabras de un título (manual: resaltado). */
export function Highlight({ children, tone }: HighlightProps) {
  return (
    <span className={cn("box-decoration-clone px-2", TONES[tone])}>{children}</span>
  );
}
