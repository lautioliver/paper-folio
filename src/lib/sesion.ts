import { connection } from "next/server";
import type { Session } from "next-auth";
import { auth } from "@/auth";
import { evaluarAcceso } from "./acceso";
import { EnvInvalidoError } from "./env";
import type { EstadoSesion } from "./ingreso";
import { buscarRol } from "./usuarios";

export type SesionDeLaApp = Session | null;

/**
 * Sesión para la UI de la barra: solo el token, sin tocar la base. `null` si no hay sesión o si Auth.js
 * no está configurado (sin variables AUTH_*): el sitio público tiene que seguir andando mostrando "Ingresar".
 */
export async function sesionParaLaBarra(): Promise<SesionDeLaApp> {
  // Antes del try: marca la lectura como dinámica (en el prerender corta acá), así el catch de abajo
  // nunca se traga esa señal y la landing no queda con "Ingresar" fijo en el HTML estático.
  await connection();
  try {
    return (await auth()) as SesionDeLaApp;
  } catch (error) {
    if (error instanceof EnvInvalidoError) return null;
    // Una cookie inválida u otro fallo de Auth.js no puede romper la landing.
    console.error("sesion: no se pudo leer la sesión de la barra", error instanceof Error ? error.name : "desconocido");
    return null;
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
    throw error;
  }
  const acceso = await evaluarAcceso(sesion, [], (id) => buscarRol(id));
  if (acceso.ok) return { estado: "valida", configurado: true };
  return { estado: acceso.motivo === "sesion-huerfana" ? "huerfana" : "ninguna", configurado: true };
}
