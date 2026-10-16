"use server";

// STUB (tests en rojo).
import type { EstadoAccion, EstadoFormulario } from "./tipos";

export async function crearProyectoAccion(previo: EstadoFormulario, formData: FormData): Promise<EstadoFormulario> {
  void formData;
  return previo;
}

export async function actualizarProyectoAccion(
  id: string,
  previo: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  void id;
  void formData;
  return previo;
}

export async function borrarProyectoAccion(id: string, previo: EstadoAccion): Promise<EstadoAccion> {
  void id;
  return previo;
}

export async function publicarProyectoAccion(id: string, publicado: boolean, previo: EstadoAccion): Promise<EstadoAccion> {
  void id;
  void publicado;
  return previo;
}

export async function reordenarProyectosAccion(previo: EstadoAccion, formData: FormData): Promise<EstadoAccion> {
  void formData;
  return previo;
}
