import type { ContactType } from "./contact";
import type { EstadoConsulta } from "./estados-consulta";

export const LARGO_MAXIMO_NOTA = 2000;

export type TipoSeguimiento = "nota" | "respuesta" | "estado";

export type EntradaSeguimiento = {
  tipo: TipoSeguimiento;
  texto: string;
  autor: string;
  autorNombre: string;
  fecha: Date;
  emailEnviado?: boolean;
};

export type DetalleConsulta = {
  id: string;
  nombre: string;
  email: string;
  tipo: ContactType;
  mensaje: string;
  estado: EstadoConsulta;
  emailEnviado: boolean;
  creadaEn: Date;
  seguimiento: EntradaSeguimiento[];
};

export type ResultadoSeguimiento =
  | { ok: true }
  | {
      ok: false;
      error: "no-encontrada" | "transicion-invalida" | "invalida";
      mensaje: string;
    };

export async function obtenerConsulta(
  id: string,
): Promise<DetalleConsulta | null> {
  void id;
  return null;
}

export async function cambiarEstado(
  id: string,
  estado: unknown,
  autor: string,
): Promise<ResultadoSeguimiento> {
  void id;
  void estado;
  void autor;
  return { ok: true };
}

export async function agregarNota(
  id: string,
  texto: unknown,
  autor: string,
): Promise<ResultadoSeguimiento> {
  void id;
  void texto;
  void autor;
  return { ok: true };
}
