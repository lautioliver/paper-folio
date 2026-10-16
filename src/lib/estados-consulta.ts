// Estados de una consulta y sus transiciones (épica #36, decisión 2), y el largo de las notas. Módulo puro:
// lo usan el modelo, la bandeja, el detalle y el cliente, sin arrastrar Mongoose.

export const ESTADOS_CONSULTA = [
  "nueva",
  "en_curso",
  "respondida",
  "archivada",
] as const;
export type EstadoConsulta = (typeof ESTADOS_CONSULTA)[number];

export const ETIQUETAS_ESTADO: Record<EstadoConsulta, string> = {
  nueva: "Nueva",
  en_curso: "En curso",
  respondida: "Respondida",
  archivada: "Archivada",
};

/**
 * A qué estados se puede pasar a mano desde cada uno: `nueva → en_curso → respondida → archivada`, y desde
 * `archivada` se vuelve a `en_curso`. A `nueva` no se vuelve nunca. Responder por email (#40) es otro camino.
 */
export const TRANSICIONES: Record<EstadoConsulta, readonly EstadoConsulta[]> = {
  nueva: ["en_curso"],
  en_curso: ["respondida"],
  respondida: ["archivada"],
  archivada: ["en_curso"],
};

export function esEstadoConsulta(valor: unknown): valor is EstadoConsulta {
  return (ESTADOS_CONSULTA as readonly unknown[]).includes(valor);
}

/** Estados desde los que se puede llegar a `hacia` (para el filtro atómico del update). */
export function origenesDe(hacia: EstadoConsulta): EstadoConsulta[] {
  return ESTADOS_CONSULTA.filter((e) => TRANSICIONES[e].includes(hacia));
}

/** Largo máximo de una nota del seguimiento. Lo usan el `maxLength` del formulario y la validación del servidor. */
export const LARGO_MAXIMO_NOTA = 2000;

/**
 * Estado con el que se trata una consulta guardada. Antes de #39 `estado` no tenía enum: uno desconocido
 * (editado a mano) o ausente se trata como `nueva`, así se ve en la bandeja y se puede pasar a `en_curso`.
 */
export function estadoLeido(valor: unknown): EstadoConsulta {
  return esEstadoConsulta(valor) ? valor : "nueva";
}

/**
 * Condición de Mongo sobre `estado` para "alguno de `estados`", coherente con `estadoLeido`: si incluye
 * `nueva`, también entran los documentos con un estado desconocido o sin el campo.
 */
export function filtroDeEstados(
  estados: readonly EstadoConsulta[],
): { $in: EstadoConsulta[] } | { $nin: EstadoConsulta[] } {
  return estados.includes("nueva")
    ? { $nin: ESTADOS_CONSULTA.filter((e) => !estados.includes(e)) }
    : { $in: [...estados] };
}
