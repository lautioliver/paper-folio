import type { Rol } from "@/models/Usuario";

/** Clase común de los enlaces del menú del panel. Acá y no en `EnlaceActual` (cliente), que la importa. */
export const CLASE_ENLACE =
  "apretable contorno flex items-center justify-center px-4 py-2 text-pequeno font-bold lg:justify-start";

export type EnlacePanel = { href: string; etiqueta: string; roles: readonly Rol[] };

/**
 * Secciones del menú del panel y quién las ve. Una entrada por sección. Solo es UI: cada página y cada acción
 * exige su rol en el servidor (`requerirRol`), esconder el enlace no protege nada.
 */
export const ENLACES_PANEL: readonly EnlacePanel[] = [
  { href: "/panel/consultas", etiqueta: "Consultas", roles: ["operador", "admin"] },
  { href: "/panel/proyectos", etiqueta: "Proyectos", roles: ["admin"] },
];

export function enlacesPara(rol: Rol): EnlacePanel[] {
  return ENLACES_PANEL.filter((e) => e.roles.includes(rol));
}
