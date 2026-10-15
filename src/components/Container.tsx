import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type ContainerProps = {
  children: ReactNode;
  className?: string;
};

/**
 * Ancho máximo y márgenes laterales de cada sección.
 * `className` suma clases (por ejemplo `py-24`); no sirve para pisar el ancho ni el padding horizontal (ver `cn`).
 */
export function Container({ children, className }: ContainerProps) {
  return <div className={cn("mx-auto w-full max-w-6xl px-4 sm:px-6", className)}>{children}</div>;
}
