import { z } from "zod";
import { Consulta } from "@/models/Consulta";
import { CONTACT_TYPES, type ContactType } from "./contact";
import { asegurarIndicesDe, conectar } from "./db";
import {
  ESTADOS_CONSULTA,
  estadoLeido,
  filtroDeEstados,
  type EstadoConsulta,
} from "./estados-consulta";

export const POR_PAGINA = 20;

const LARGO_EXTRACTO = 140;

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
  /** Página realmente devuelta: la pedida, o la última válida si se pasó (mínimo 1). */
  pagina: number;
};

// Un valor inválido (otro tipo, un arreglo `?tipo=a&tipo=b`, un objeto con operadores de Mongo)
// se descarta en vez de fallar: la bandeja se ve sin ese filtro. Nada del input llega crudo a la consulta.
const filtrosSchema = z.object({
  tipo: z.enum(CONTACT_TYPES).optional().catch(undefined),
  estado: z.enum(ESTADOS_CONSULTA).optional().catch(undefined),
  pagina: z.coerce.number().int().min(1).catch(1),
});

export type FiltrosBandeja = {
  tipo?: unknown;
  estado?: unknown;
  pagina?: unknown;
};
export type FiltrosValidos = {
  tipo?: ContactType;
  estado?: EstadoConsulta;
  pagina: number;
};

/** Valida los query params de la bandeja (`tipo`, `estado`, `pagina`); lo inválido se descarta. */
export function parsearFiltros(input: unknown): FiltrosValidos {
  const crudo =
    typeof input === "object" && input !== null
      ? (input as FiltrosBandeja)
      : {};
  // `coerce` convertiría `null`, `[]` o `true` en números: solo se aceptan enteros o cadenas de dígitos.
  const pagina =
    typeof crudo.pagina === "number" ||
    (typeof crudo.pagina === "string" && /^\d+$/.test(crudo.pagina))
      ? // Un número gigante cuenta como "más allá del final", no como inválido.
        typeof crudo.pagina === "string" &&
        crudo.pagina.replace(/^0+/, "").length > 9
        ? 1_000_000_000
        : crudo.pagina
      : undefined;
  const r = filtrosSchema.parse({
    tipo: crudo.tipo,
    estado: crudo.estado,
    pagina,
  });
  const filtros: FiltrosValidos = { pagina: r.pagina };
  if (r.tipo) filtros.tipo = r.tipo;
  if (r.estado) filtros.estado = r.estado;
  return filtros;
}

function extractoDe(mensaje: string): string {
  const limpio = mensaje.replace(/\s+/g, " ").trim();
  // Por puntos de código, no por unidades UTF-16: así no se corta un emoji por la mitad.
  const letras = Array.from(limpio);
  return letras.length > LARGO_EXTRACTO
    ? `${letras.slice(0, LARGO_EXTRACTO).join("").trimEnd()}…`
    : limpio;
}

/**
 * Lista las consultas de la más nueva a la más vieja, de a `POR_PAGINA`. Los filtros llegan ya validados
 * (`parsearFiltros` sobre los `searchParams`). Si la página se pasa del final, devuelve la última.
 * Proyecta campos explícitos: `ipHash` y `email` no salen de este módulo.
 */
export async function listarConsultas(
  filtros: FiltrosValidos,
): Promise<Bandeja> {
  const { tipo, estado, pagina: pedida } = filtros;
  const filtro: { tipo?: ContactType; estado?: ReturnType<typeof filtroDeEstados> } = {};
  if (tipo) filtro.tipo = tipo;
  if (estado) filtro.estado = filtroDeEstados([estado]);

  await conectar();
  try {
    await asegurarIndicesDe(Consulta);
  } catch (error) {
    // Sin el índice la bandeja anda igual (más lenta); se reintenta en la próxima. Solo el nombre del error:
    // el mensaje puede traer la URI de la base.
    console.error(
      "listarConsultas: no se pudo crear el índice de consultas:",
      error instanceof Error ? error.name : "error",
    );
  }
  const total = await Consulta.countDocuments(filtro);
  const paginas = Math.ceil(total / POR_PAGINA);
  const pagina = Math.min(pedida, Math.max(paginas, 1));
  const docs = await Consulta.find(filtro, {
    nombre: 1,
    tipo: 1,
    estado: 1,
    mensaje: 1,
    creadaEn: 1,
  })
    .sort({ creadaEn: -1, _id: -1 })
    .skip((pagina - 1) * POR_PAGINA)
    .limit(POR_PAGINA)
    .lean();

  const items = docs.map((d) => ({
    id: String(d._id),
    nombre: d.nombre,
    tipo: d.tipo,
    estado: estadoLeido(d.estado),
    extracto: extractoDe(d.mensaje),
    creadaEn: d.creadaEn,
  }));
  return { items, total, paginas, pagina };
}
