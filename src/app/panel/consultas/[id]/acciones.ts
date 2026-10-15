"use server";

import type { EstadoAccion } from "./tipos";

export async function cambiarEstadoAccion(
  id: string,
  _previo: EstadoAccion,
  formData: FormData,
): Promise<EstadoAccion> {
  void id;
  void formData;
  return { error: null };
}

export async function agregarNotaAccion(
  id: string,
  _previo: EstadoAccion,
  formData: FormData,
): Promise<EstadoAccion> {
  void id;
  void formData;
  return { error: null };
}
