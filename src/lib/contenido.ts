import type { Demo, Proyecto, Servicio } from "./contenido-esquemas";

export type { Demo, Proyecto, Servicio } from "./contenido-esquemas";

/** Tag de caché del contenido: el panel lo invalida con `updateTag(TAG_CONTENIDO)` al editar. */
export const TAG_CONTENIDO = "contenido";

export async function listarProyectos(): Promise<Proyecto[]> {
  return [];
}

export async function buscarProyecto(slug: string): Promise<Proyecto | null> {
  void slug;
  return null;
}

export async function demosDe(slug: string): Promise<Demo[]> {
  void slug;
  return [];
}

export async function listarServicios(): Promise<Servicio[]> {
  return [];
}
