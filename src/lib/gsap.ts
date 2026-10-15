"use client";

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

// Un solo lugar donde se registra el plugin. Solo se importa desde componentes de cliente.
gsap.registerPlugin(ScrollTrigger);

/** Consulta que activa las animaciones: con reduced-motion no se crea ninguna. */
export const MOTION_OK = "(prefers-reduced-motion: no-preference)";

export { gsap, ScrollTrigger };
