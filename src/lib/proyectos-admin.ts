// STUB (tests en rojo).

export type ResultadoProyecto =
  | { ok: true; id?: string }
  | {
      ok: false;
      error: "invalida" | "no-encontrado" | "desactualizada";
      mensaje: string;
      campos?: Record<string, string>;
    };

export type ProyectoEnLista = { id: string; slug: string; nombre: string; orden: number; publicado: boolean; demos: number };

export async function listarProyectosAdmin(): Promise<ProyectoEnLista[]> {
  return [];
}

export async function obtenerProyectoAdmin(id: string): Promise<Record<string, unknown> | null> {
  void id;
  return null;
}

export async function crearProyecto(datos: unknown): Promise<ResultadoProyecto> {
  void datos;
  return { ok: true, id: "" };
}

export async function actualizarProyecto(id: string, datos: unknown): Promise<ResultadoProyecto> {
  void id;
  void datos;
  return { ok: true, id: "" };
}

export async function borrarProyecto(id: string): Promise<ResultadoProyecto> {
  void id;
  return { ok: true, id: "" };
}

export async function publicarProyecto(id: string, publicado: boolean): Promise<ResultadoProyecto> {
  void id;
  void publicado;
  return { ok: true, id: "" };
}

export async function reordenar(ids: unknown): Promise<ResultadoProyecto> {
  void ids;
  return { ok: true, id: "" };
}
