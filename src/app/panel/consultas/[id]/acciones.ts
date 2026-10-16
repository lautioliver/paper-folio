"use server";

import { refresh } from "next/cache";
import { requerirRol } from "@/lib/permisos";
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
  if (!r.ok) return { error: r.mensaje };
  refresh();
  return { error: null };
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
