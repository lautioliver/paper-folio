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

/** Instante (UTC) en que empieza el día `fecha` (`YYYY-MM-DD`) en America/Argentina/Salta. */
export function inicioDelDia(fecha: string): Date {
  void fecha;
  return new Date(0);
}

/** Suma `n` días (o resta, con `n` negativo) a `fecha` (`YYYY-MM-DD`). */
export function sumarDias(fecha: string, n: number): string {
  void n;
  return fecha;
}

/** Los días de `desde` a `hasta` (inclusive), en orden. */
export function diasEntre(desde: string, hasta: string): string[] {
  void desde;
  void hasta;
  return [];
}
