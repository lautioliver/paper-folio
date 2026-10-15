import type { ContactField, ContactRequest } from "./contact";

export const LIMITE_POR_HORA = 5;

export type ConsultaCreada = { id: string } & ContactRequest;

export type ResultadoConsulta =
  | { tipo: "creada"; consulta: ConsultaCreada }
  | { tipo: "invalida"; errores: Partial<Record<ContactField, string>> }
  | { tipo: "limite" }
  | { tipo: "descartada" };

export type OpcionesConsulta = {
  ip: string;
  avisar?: (consulta: ConsultaCreada) => Promise<void> | void;
  ahora?: () => Date;
};

// Stub del paso rojo.
export async function crearConsulta(_input: unknown, _opciones: OpcionesConsulta): Promise<ResultadoConsulta> {
  return { tipo: "descartada" };
}
