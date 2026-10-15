import { urlDeIngreso } from "./acceso";

/**
 * Prefijos que `proxy.ts` protege con la redirección rápida. El `matcher` de `proxy.ts` tiene que cubrir los
 * mismos (Next lo exige como literal, así que no se puede importar). Para sumar una ruta protegida, agregala acá
 * y en el `matcher`. El control real sigue estando en cada página (`requerirSesion` / `requerirRol`).
 */
export const PREFIJOS_PROTEGIDOS = ["/proyectos/"] as const;

function estaProtegida(pathname: string): boolean {
  // "/proyectos/" solo (el listado con barra final) es público: tiene que haber algo después del prefijo.
  return PREFIJOS_PROTEGIDOS.some(
    (prefijo) => pathname.startsWith(prefijo) && pathname.slice(prefijo.length).replaceAll("/", "") !== "",
  );
}

/**
 * Decide si `proxy.ts` tiene que redirigir a `/ingresar`. Devuelve la URL de destino (con `callbackUrl`)
 * o `null` si deja pasar.
 */
export function redireccionDeProxy(pathname: string, haySesion: boolean): string | null {
  if (haySesion || !estaProtegida(pathname)) return null;
  return urlDeIngreso(pathname);
}
