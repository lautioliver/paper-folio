"use server";

import { refresh } from "next/cache";
import { after } from "next/server";
import { requerirRol } from "@/lib/permisos";
import { responderConsulta } from "@/lib/respuestas";
import {
  agregarNota,
  cambiarEstado,
  type ResultadoSeguimiento,
} from "@/lib/seguimiento";
import { rutaDelDetalle } from "./ruta";
import type { EstadoAccion } from "./tipos";

// Cada acción se puede llamar directo (un POST armado a mano, con cualquier `id`): el rol se exige acá,
// antes de tocar la base, y el autor sale siempre de la sesión. El id y los campos los valida el servicio.

function campo(formData: FormData, nombre: string): string | null {
  const valor = formData.get(nombre);
  return typeof valor === "string" ? valor : null;
}

function responder(r: ResultadoSeguimiento): EstadoAccion {
  // Una transición inválida suele ser una pantalla vieja (otro operador la cambió en el medio): se refresca
  // igual, así se ve el estado real junto con el mensaje.
  if (r.ok || r.error === "transicion-invalida") refresh();
  return { error: r.ok ? null : r.mensaje };
}

/** Cambia el estado de la consulta `id` al del campo `estado`. */
export async function cambiarEstadoAccion(
  id: string,
  _previo: EstadoAccion,
  formData: FormData,
): Promise<EstadoAccion> {
  const sesion = await requerirRol(rutaDelDetalle(id), "operador", "admin");
  return responder(await cambiarEstado(id, campo(formData, "estado"), sesion.id));
}

/** Agrega al seguimiento de la consulta `id` la nota del campo `texto`. */
export async function agregarNotaAccion(
  id: string,
  _previo: EstadoAccion,
  formData: FormData,
): Promise<EstadoAccion> {
  const sesion = await requerirRol(rutaDelDetalle(id), "operador", "admin");
  const texto = campo(formData, "texto");
  const r = responder(await agregarNota(id, texto, sesion.id));
  return { ...r, texto: r.error ? (texto ?? "") : "" };
}

/**
 * Responde por email la consulta `id` con el campo `texto`. El destino no sale del formulario: lo toma
 * `responderConsulta` de la consulta guardada. Si el envío falló, la entrada no enviada ya quedó en el
 * seguimiento (por eso refresca) y el texto vuelve para reintentar; si venció el timeout, la entrada queda
 * pendiente y se completa con `after` cuando el envío termina.
 */
export async function responderAccion(
  id: string,
  _previo: EstadoAccion,
  formData: FormData,
): Promise<EstadoAccion> {
  const sesion = await requerirRol(rutaDelDetalle(id), "operador", "admin");
  const texto = campo(formData, "texto");
  // Tras un timeout, el registro del envío tardío sigue después de responder: `after` mantiene viva la
  // función hasta que termina (#66).
  const r = await responderConsulta(id, texto, sesion.id, undefined, { seguir: after });
  // Salvo un texto inválido o una consulta inexistente, el estado o el seguimiento cambiaron: se refresca.
  if (r.ok || (r.error !== "invalida" && r.error !== "no-encontrada")) refresh();
  return r.ok ? { error: null, texto: "" } : { error: r.mensaje, texto: texto ?? "" };
}
