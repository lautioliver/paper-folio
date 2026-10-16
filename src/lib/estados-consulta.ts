// Estados de una consulta y sus transiciones (épica #36, decisión 2). Módulo puro: lo usan el modelo,
// la bandeja, el detalle y el cliente, sin tocar la base.

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

/** Si se puede pasar de `desde` a `hacia` con un cambio de estado manual. */
export function esTransicionValida(desde: string, hacia: string): boolean {
  // `esEstadoConsulta` antes de indexar: "constructor" o "__proto__" no son claves propias de TRANSICIONES.
  return (
    esEstadoConsulta(desde) &&
    esEstadoConsulta(hacia) &&
    TRANSICIONES[desde].includes(hacia)
  );
}

/** Estados desde los que se puede llegar a `hacia` (para el filtro atómico del update). */
export function origenesDe(hacia: EstadoConsulta): EstadoConsulta[] {
  return ESTADOS_CONSULTA.filter((e) => TRANSICIONES[e].includes(hacia));
}

export const LARGO_MAXIMO_NOTA = 0;

export function estadoLeido(valor: unknown): EstadoConsulta {
  return valor as EstadoConsulta;
}

export function filtroDeEstados(estados: readonly EstadoConsulta[]): object {
  void estados;
  return {};
}
