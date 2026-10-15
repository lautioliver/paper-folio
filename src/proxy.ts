import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/auth";
import { redireccionDeProxy } from "@/lib/proteccion";

/**
 * Redirección rápida a `/ingresar?callbackUrl=…` para las rutas que piden sesión (ADR-002).
 * Es solo comodidad: el control real está en cada página (`requerirSesion` / `requerirRol`), que releen el rol
 * de la base. Sacar este archivo no deja nada desprotegido.
 *
 * Sesión: `auth` de Auth.js como wrapper del proxy (patrón de Auth.js v5). Valida la firma del JWT con
 * `AUTH_SECRET`, en vez de mirar solo si existe la cookie (una cookie inventada no pasaría). Como la
 * configuración de `src/auth.ts` es perezosa, `auth(callback)` devuelve una promesa del wrapper y por eso
 * se espera antes de usarlo. Si falta la configuración de Auth.js, falla cerrado: el pedido da error en vez
 * de dejar pasar.
 */
export async function proxy(request: NextRequest) {
  const conSesion = await auth((req) => {
    const destino = redireccionDeProxy(req.nextUrl.pathname, Boolean(req.auth?.user));
    return destino ? NextResponse.redirect(new URL(destino, req.nextUrl)) : NextResponse.next();
  });
  // El tipo del wrapper pide el contexto de un route handler; el proxy no lo usa.
  return conSesion(request, { params: Promise.resolve({}) });
}

// Next exige el matcher como literal. Mantenelo igual que `PREFIJOS_PROTEGIDOS` (src/lib/proteccion.ts).
// Para sumar una ruta protegida, agregala a los dos. `/panel` solo (sin subruta) no pasa por acá: la página
// redirige a `/panel/consultas`, que sí.
export const config = {
  matcher: ["/proyectos/:path+", "/panel/:path+"],
};
