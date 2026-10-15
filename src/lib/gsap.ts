import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

// Un solo lugar donde se registra el plugin. El módulo también se evalúa en el servidor al prerenderizar
// (registerPlugin no toca window ahí); las animaciones solo se crean en useEffect, nunca al renderizar.
gsap.registerPlugin(ScrollTrigger);

/** Consulta que activa las animaciones: con reduced-motion no se crea ninguna. */
export const MOTION_OK = "(prefers-reduced-motion: no-preference)";

export { gsap, ScrollTrigger };
