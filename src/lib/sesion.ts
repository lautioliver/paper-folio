import { connection } from "next/server";
import type { Session } from "next-auth";
import { auth } from "@/auth";
import { evaluarAcceso } from "./acceso";
import { EnvInvalidoError } from "./env";
import { comprobarSesion, type EstadoSesion } from "./ingreso";
import { buscarRol } from "./usuarios";
import type { Rol } from "@/models/Usuario";

export type SesionDeLaApp = Session | null;

/**
 * Sesión para la UI de la barra. `null` si no hay sesión o si Auth.js no está configurado (sin variables
 * AUTH_*): el sitio público tiene que seguir andando mostrando "Ingresar". El rol no es el del token (se fija
 * al ingresar): se relee de la base con `buscarRol` (#109), así un cambio de rol desde /panel/usuarios
 * muestra u oculta "Panel" sin volver a ingresar. Bloqueada, borrada o si la base falla, va como `usuario` (sin
 * "Panel"): es solo UI, cada página del panel protege con `requerirRol`.
 */
export async function sesionParaLaBarra(): Promise<SesionDeLaApp> {
  // Antes del try: marca la lectura como dinámica (en el prerender corta acá), así el catch de abajo
  // nunca se traga esa señal y la landing no queda con "Ingresar" fijo en el HTML estático.
  await connection();
  let sesion: SesionDeLaApp;
  try {
    sesion = (await auth()) as SesionDeLaApp;
  } catch (error) {
    if (error instanceof EnvInvalidoError) return null;
    // Una cookie inválida u otro fallo de Auth.js no puede romper la landing.
    console.error("sesion: no se pudo leer la sesión de la barra", error instanceof Error ? error.name : "desconocido");
    return null;
  }
  if (!sesion?.user?.id) return sesion;
  return { ...sesion, user: { ...sesion.user, rol: await rolParaLaBarra(sesion.user.id) } };
}

async function rolParaLaBarra(id: string): Promise<Rol> {
  try {
    const estado = await buscarRol(id);
    return estado === "bloqueado" || estado === null ? "usuario" : estado;
  } catch (error) {
    // La base o ADMIN_EMAILS fallan: la landing sigue, sin "Panel".
    console.error("sesion: no se pudo releer el rol de la barra", error instanceof Error ? error.name : "desconocido");
    return "usuario";
  }
}

/**
 * Estado real de la sesión para /ingresar: relee el rol de la base (`evaluarAcceso`), porque un token
 * puede ser válido con el usuario ya borrado. `configurado: false` si faltan las variables AUTH_*.
 */
export async function estadoDeSesion(): Promise<{ estado: EstadoSesion; configurado: boolean }> {
  // Auth.js genera valores al azar antes de leer las cookies: sin esto, Next los toma por una lectura
  // estática en el prerender y marca la ruta como bloqueante.
  await connection();
  let sesion: SesionDeLaApp;
  try {
    sesion = (await auth()) as SesionDeLaApp;
  } catch (error) {
    if (error instanceof EnvInvalidoError) return { estado: "ninguna", configurado: false };
    // Una cookie corrupta no puede dejar /ingresar en 500: es la página para recuperarse.
    console.error("sesion: no se pudo leer la sesión", error instanceof Error ? error.name : "desconocido");
    return { estado: "ninguna", configurado: true };
  }
  return { estado: await comprobarSesion(sesion, (id) => buscarRol(id)), configurado: true };
}

/**
 * Si quien hace el pedido es `admin`, con la misma decisión que los permisos (`evaluarAcceso` con el rol que
 * relee `buscarRol`, que ya suma `ADMIN_EMAILS`). Lo usa `POST /api/visitas` para no contar a los admin: no es
 * un permiso. `false` sin sesión, con una sesión ilegible, sin `AUTH_*` o con `ADMIN_EMAILS` inválida, y con la
 * cuenta bloqueada o borrada: una cuenta bloqueada no tiene permisos (domain.md), así que su visita cuenta como
 * la de cualquiera. Si la base falla, tira (quien llama decide).
 */
export async function esAdminLaSesion(): Promise<boolean> {
  await connection(); // ver `estadoDeSesion`
  let sesion: SesionDeLaApp;
  try {
    sesion = (await auth()) as SesionDeLaApp;
  } catch (error) {
    if (error instanceof EnvInvalidoError) return false;
    console.error("sesion: no se pudo leer la sesión", error instanceof Error ? error.name : "desconocido");
    return false;
  }
  try {
    return (await evaluarAcceso(sesion, ["admin"], (id) => buscarRol(id))).ok;
  } catch (error) {
    // `ADMIN_EMAILS` inválida (`buscarRol` la lee): es configuración, no la base, y la visita se cuenta igual.
    if (error instanceof EnvInvalidoError) return false;
    throw error;
  }
}
