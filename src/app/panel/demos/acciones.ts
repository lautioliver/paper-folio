"use server";

import type { EstadoFormulario } from "./tipos";

export async function guardarDemoAccion(
  _id: string | null,
  previo: EstadoFormulario,
  _formData: FormData,
): Promise<EstadoFormulario> {
  return previo;
}

export async function activarDemoAccion(_id: string, _activa: boolean): Promise<void> {}

export async function moverDemoAccion(_id: string, _direccion: "subir" | "bajar"): Promise<void> {}

export async function borrarDemoAccion(_id: string): Promise<void> {}
