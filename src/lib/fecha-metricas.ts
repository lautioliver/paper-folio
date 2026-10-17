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

const formatosOffset = new Map<string, Intl.DateTimeFormat>();
const DIA_MS = 86_400_000;

/** Desfase de `zona` respecto de UTC en `instante`, en ms (Salta: -3 h; `GMT` sin horas es 0). */
function desfase(instante: number, zona: string): number {
  let formato = formatosOffset.get(zona);
  if (!formato) {
    formato = new Intl.DateTimeFormat("en-US", { timeZone: zona, timeZoneName: "longOffset" });
    formatosOffset.set(zona, formato);
  }
  const nombre = formato.formatToParts(instante).find((p) => p.type === "timeZoneName")?.value ?? "GMT";
  const m = /GMT([+-])(\d{2}):(\d{2})/.exec(nombre);
  if (!m) return 0;
  const minutos = Number(m[2]) * 60 + Number(m[3]);
  return (m[1] === "-" ? -1 : 1) * minutos * 60_000;
}

/**
 * Instante (UTC) en que empieza el día `fecha` (`YYYY-MM-DD`) en `zona` (America/Argentina/Salta por defecto).
 * El desfase se toma dos veces: primero el de la medianoche UTC y después el del instante estimado, por si la zona
 * cambia de hora entre los dos (horario de verano).
 */
export function inicioDelDia(fecha: string, zona: string = ZONA_METRICAS): Date {
  const medianocheUtc = Date.parse(`${fecha}T00:00:00Z`);
  const estimado = medianocheUtc - desfase(medianocheUtc, zona);
  return new Date(medianocheUtc - desfase(estimado, zona));
}

/** Suma `n` días (o resta, con `n` negativo) a `fecha` (`YYYY-MM-DD`). Es aritmética de calendario, sin zona. */
export function sumarDias(fecha: string, n: number): string {
  return new Date(Date.parse(`${fecha}T00:00:00Z`) + n * DIA_MS).toISOString().slice(0, 10);
}

/** Los días de `desde` a `hasta` (inclusive), en orden. Vacío si `desde` es posterior. */
export function diasEntre(desde: string, hasta: string): string[] {
  const dias: string[] = [];
  for (let dia = desde; dia <= hasta; dia = sumarDias(dia, 1)) dias.push(dia);
  return dias;
}

/** `2026-10-16` → `16/10`, sin pasar por `Date` (la fecha ya es el día de Salta). */
export function diaCorto(fecha: string): string {
  return `${fecha.slice(8, 10)}/${fecha.slice(5, 7)}`;
}

/** `2026-10-16` → `16/10/2026`. */
export function diaLargo(fecha: string): string {
  return `${diaCorto(fecha)}/${fecha.slice(0, 4)}`;
}
