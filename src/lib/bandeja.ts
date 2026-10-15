import type { ContactType } from "./contact";

export const POR_PAGINA = 20;
export const ESTADOS_CONSULTA = [
  "nueva",
  "en_curso",
  "respondida",
  "archivada",
] as const;
export type EstadoConsulta = (typeof ESTADOS_CONSULTA)[number];

export type ItemBandeja = {
  id: string;
  nombre: string;
  tipo: ContactType;
  estado: EstadoConsulta;
  extracto: string;
  creadaEn: Date;
};

export type Bandeja = {
  items: ItemBandeja[];
  total: number;
  paginas: number;
  pagina: number;
};

export type FiltrosBandeja = {
  tipo?: unknown;
  estado?: unknown;
  pagina?: unknown;
};

export function parsearFiltros(_input: unknown): {
  tipo?: ContactType;
  estado?: EstadoConsulta;
  pagina: number;
} {
  return { pagina: 0 };
}

export async function listarConsultas(
  _filtros: FiltrosBandeja,
): Promise<Bandeja> {
  return { items: [], total: -1, paginas: -1, pagina: -1 };
}
