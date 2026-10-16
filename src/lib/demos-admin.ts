import type { CampoDemo } from "./demos-campos";

export { LARGO_DESCRIPCION, LARGO_TITULO, type CampoDemo } from "./demos-campos";

export type DemoAdmin = {
  id: string;
  proyecto: string;
  titulo: string;
  url: string;
  descripcion: string;
  activa: boolean;
  orden: number;
};

export type ProyectoDeDemo = { id: string; nombre: string };

export type GrupoDemos = { proyecto: ProyectoDeDemo | null; demos: DemoAdmin[] };

export type ResultadoDemo =
  | { ok: true; id: string }
  | {
      ok: false;
      error: "invalido" | "no-encontrado";
      mensaje: string;
      campos?: Partial<Record<CampoDemo, string>>;
    };

export type EntradaDemo = {
  proyecto?: unknown;
  titulo?: unknown;
  url?: unknown;
  descripcion?: unknown;
  activa?: unknown;
};

const STUB: ResultadoDemo = { ok: false, error: "no-encontrado", mensaje: "stub" };

export async function listarDemosAdmin(): Promise<GrupoDemos[]> {
  return [];
}
export async function proyectosParaDemos(): Promise<ProyectoDeDemo[]> {
  return [];
}
export async function obtenerDemoAdmin(_id: string): Promise<DemoAdmin | null> {
  return null;
}
export async function crearDemo(_entrada: EntradaDemo): Promise<ResultadoDemo> {
  return STUB;
}
export async function editarDemo(_id: string, _entrada: EntradaDemo): Promise<ResultadoDemo> {
  return STUB;
}
export async function borrarDemo(_id: string): Promise<ResultadoDemo> {
  return STUB;
}
export async function activarDemo(_id: string, _activa: unknown): Promise<ResultadoDemo> {
  return STUB;
}
export async function moverDemo(_id: string, _direccion: unknown): Promise<ResultadoDemo> {
  return STUB;
}
