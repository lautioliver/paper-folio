/** Zona de las fechas de las métricas (épica #53, decisión 1). */
export const ZONA_METRICAS = "America/Argentina/Salta";

const formatoFecha = new Intl.DateTimeFormat("en-CA", {
  timeZone: ZONA_METRICAS,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/**
 * El día de `ahora` en America/Argentina/Salta, como `YYYY-MM-DD`: la clave de los contadores diarios
 * (`visitas_diarias`, `visitantes_diarios`, `accesos_diarios`).
 */
export function fechaDeMetrica(ahora: Date): string {
  return formatoFecha.format(ahora);
}
