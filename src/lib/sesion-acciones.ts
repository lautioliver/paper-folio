"use server";

import { z } from "zod";
import { signIn, signOut } from "@/auth";
import { esquemaRutaInterna, urlDeIngreso } from "./acceso";

// El formulario de /ingresar: solo `callbackUrl`, un string con una ruta interna. Cualquier otra cosa (un sitio
// externo, un archivo, nada) vuelve al inicio.
const formularioIngreso = z.object({ callbackUrl: esquemaRutaInterna.catch("/") });

function destinoDelFormulario(formData: FormData): string {
  return formularioIngreso.parse({ callbackUrl: formData.get("callbackUrl") }).callbackUrl;
}

/** Server action del botón "Continuar con Google". El destino es siempre una ruta interna: nunca un sitio externo. */
export async function ingresarConGoogle(formData: FormData): Promise<void> {
  await signIn("google", { redirectTo: destinoDelFormulario(formData) });
}

/** "Probar con otra cuenta": como `ingresarConGoogle`, pero Google muestra el selector de cuentas. */
export async function ingresarConOtraCuenta(formData: FormData): Promise<void> {
  await signIn("google", { redirectTo: destinoDelFormulario(formData) }, { prompt: "select_account" });
}

/** Server action de "Salir": cierra la sesión y vuelve al inicio. */
export async function salir(): Promise<void> {
  await signOut({ redirectTo: "/" });
}

/** Para la sesión huérfana: cierra la sesión y deja a la persona en /ingresar para empezar de nuevo. */
export async function salirEIngresarDeNuevo(formData: FormData): Promise<void> {
  await signOut({ redirectTo: urlDeIngreso(destinoDelFormulario(formData), "sin-sesion") });
}
