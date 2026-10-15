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
  nueva: [],
  en_curso: [],
  respondida: [],
  archivada: [],
};

/** Si se puede pasar de `desde` a `hacia` con un cambio de estado manual. */
export function esTransicionValida(desde: string, hacia: string): boolean {
  void desde;
  void hacia;
  return true;
}

/** Estados desde los que se puede llegar a `hacia` (para el filtro atómico del update). */
export function origenesDe(hacia: EstadoConsulta): EstadoConsulta[] {
  return ESTADOS_CONSULTA.filter((e) => TRANSICIONES[e].includes(hacia));
}
