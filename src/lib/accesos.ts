import type { TipoAcceso } from "@/models/AccesoDiario";

export type { TipoAcceso };

/** Stub (rojo). */
export async function registrarAcceso(usuarioId: string, tipo: TipoAcceso, ahora: Date = new Date()): Promise<boolean> {
  void usuarioId;
  void tipo;
  void ahora;
  return false;
}
