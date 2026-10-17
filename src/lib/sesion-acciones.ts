"use server";

import { signIn, signOut } from "@/auth";
import { rutaInterna, urlDeIngreso } from "./acceso";

/** Server action del botón "Continuar con Google". El destino sale siempre de `rutaInterna`: nunca un sitio externo. */
export async function ingresarConGoogle(formData: FormData): Promise<void> {
  const destino = formData.get("callbackUrl");
  await signIn("google", { redirectTo: rutaInterna(typeof destino === "string" ? destino : "/") });
}

/** Stub (#45). */
export async function ingresarConOtraCuenta(formData: FormData): Promise<void> {
  await ingresarConGoogle(formData);
}

/** Server action de "Salir": cierra la sesión y vuelve al inicio. */
export async function salir(): Promise<void> {
  await signOut({ redirectTo: "/" });
}

/** Para la sesión huérfana: cierra la sesión y deja a la persona en /ingresar para empezar de nuevo. */
export async function salirEIngresarDeNuevo(formData: FormData): Promise<void> {
  const destino = formData.get("callbackUrl");
  await signOut({ redirectTo: urlDeIngreso(typeof destino === "string" ? destino : "/", "sin-sesion") });
}
