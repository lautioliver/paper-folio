import type { Rol } from "@/models/Usuario";

export type EnlacePanel = { href: string; etiqueta: string };

// Una entrada por sección, con los roles que la ven. Mostrar u ocultar una entrada es solo UI: cada página
// y cada acción de la sección exige su rol en el servidor.
const SECCIONES: (EnlacePanel & { roles: readonly Rol[] })[] = [
  { href: "/panel/consultas", etiqueta: "Consultas", roles: ["operador", "admin"] },
  { href: "/panel/proyectos", etiqueta: "Proyectos", roles: ["admin"] },
  { href: "/panel/demos", etiqueta: "Demos", roles: ["admin"] },
  { href: "/panel/servicios", etiqueta: "Servicios", roles: ["admin"] },
  { href: "/panel/usuarios", etiqueta: "Usuarios", roles: ["admin"] },
  { href: "/panel/metricas", etiqueta: "Métricas", roles: ["admin"] },
];

/** Las secciones del panel que ve un rol, en orden. */
export function enlacesPara(rol: Rol): EnlacePanel[] {
  return SECCIONES.filter((s) => s.roles.includes(rol)).map(({ href, etiqueta }) => ({ href, etiqueta }));
}

/** Si `pathname` es la sección `href` o una de sus subrutas. */
export function esActual(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}
