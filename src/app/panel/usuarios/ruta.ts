import { z } from "zod";

export const RUTA_USUARIOS = "/panel/usuarios";
export const LARGO_BUSQUEDA = 100;

// Los avisos viajan en la URL como un código (`?aviso=propio`) y el texto sale de acá: la página nunca
// muestra lo que venga en la query.
export const AVISOS = {
  "rol-cambiado": { tipo: "ok", mensaje: "Listo: cambiamos el rol. Los permisos valen desde su próximo pedido, sin volver a ingresar (el menú de su cuenta lo muestra cuando vuelva a ingresar)." },
  bloqueado: { tipo: "ok", mensaje: "Listo: bloqueamos la cuenta. Ya no puede ingresar y sus sesiones abiertas perdieron los permisos." },
  desbloqueado: { tipo: "ok", mensaje: "Listo: desbloqueamos la cuenta." },
  propio: { tipo: "error", mensaje: "No podés cambiar tu propio rol ni bloquear tu cuenta." },
  entorno: { tipo: "error", mensaje: "Ese email está en ADMIN_EMAILS: es admin siempre y no se puede degradar ni bloquear desde acá." },
  "ultimo-admin": { tipo: "error", mensaje: "Es el único admin que queda: el sitio no puede quedarse sin ninguno." },
  invalido: { tipo: "error", mensaje: "El pedido no es válido. Recargá la página y probá de nuevo." },
  "no-encontrado": { tipo: "error", mensaje: "Ese usuario ya no existe." },
} as const;
export type CodigoAviso = keyof typeof AVISOS;
export type Aviso = (typeof AVISOS)[CodigoAviso];

const busqueda = z.string().transform((q) => q.trim().slice(0, LARGO_BUSQUEDA));
const pagina = z.string().regex(/^[1-9]\d{0,5}$/).transform(Number);

/** Búsqueda y página de la URL o del formulario. Lo que no sirve cae en `""` y `1`. */
export function filtrosDe(entrada: { q?: unknown; pagina?: unknown }): { q: string; pagina: number } {
  return {
    q: busqueda.catch("").parse(entrada.q),
    pagina: pagina.catch(1).parse(entrada.pagina),
  };
}

/** URL de la lista con la búsqueda, la página y el aviso (lo que está por defecto no va). */
export function rutaUsuarios(opciones: { q?: string; pagina?: number; aviso?: CodigoAviso } = {}): string {
  const params = new URLSearchParams();
  if (opciones.q) params.set("q", opciones.q);
  if (opciones.pagina && opciones.pagina > 1) params.set("pagina", String(opciones.pagina));
  if (opciones.aviso) params.set("aviso", opciones.aviso);
  const query = params.toString();
  return query ? `${RUTA_USUARIOS}?${query}` : RUTA_USUARIOS;
}

/** El aviso de la URL, solo si es uno de `AVISOS`. */
export function avisoDe(valor: unknown): Aviso | null {
  return typeof valor === "string" && Object.hasOwn(AVISOS, valor) ? AVISOS[valor as CodigoAviso] : null;
}
