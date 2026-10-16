import type { ServiceIcon } from "@/content/profile";

export const LARGO_TITULO = 40;
export const LARGO_DESCRIPCION = 200;

export type CampoServicio = "titulo" | "descripcion" | "icono" | "imagen";

export type ServicioAdmin = {
  id: string;
  titulo: string;
  descripcion: string;
  icono?: ServiceIcon;
  imagen?: string;
  orden: number;
  publicado: boolean;
};

export type ResultadoServicio =
  | { ok: true; id: string }
  | {
      ok: false;
      error: "invalido" | "duplicado" | "no-encontrado";
      mensaje: string;
      campos?: Partial<Record<CampoServicio, string>>;
    };

export type EntradaServicio = {
  titulo?: unknown;
  descripcion?: unknown;
  ilustracion?: unknown;
  icono?: unknown;
  imagen?: unknown;
  publicado?: unknown;
};

const STUB: ResultadoServicio = { ok: false, error: "no-encontrado", mensaje: "sin implementar" };

export async function listarServiciosAdmin(): Promise<ServicioAdmin[]> {
  return [];
}
export async function obtenerServicioAdmin(id: string): Promise<ServicioAdmin | null> {
  void id;
  return null;
}
export async function crearServicio(entrada: EntradaServicio): Promise<ResultadoServicio> {
  void entrada;
  return STUB;
}
export async function editarServicio(id: string, entrada: EntradaServicio): Promise<ResultadoServicio> {
  void id;
  void entrada;
  return STUB;
}
export async function borrarServicio(id: string): Promise<ResultadoServicio> {
  void id;
  return STUB;
}
export async function publicarServicio(id: string, publicado: unknown): Promise<ResultadoServicio> {
  void id;
  void publicado;
  return STUB;
}
export async function moverServicio(id: string, direccion: unknown): Promise<ResultadoServicio> {
  void id;
  void direccion;
  return STUB;
}
