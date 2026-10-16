"use server";

import type { EstadoFormulario } from "./tipos";

export async function guardarServicioAccion(
  id: string | null,
  previo: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  void id;
  void formData;
  return previo;
}

export async function publicarServicioAccion(id: string, publicado: boolean): Promise<void> {
  void id;
  void publicado;
}

export async function moverServicioAccion(id: string, direccion: "subir" | "bajar"): Promise<void> {
  void id;
  void direccion;
}

export async function borrarServicioAccion(id: string): Promise<void> {
  void id;
}
