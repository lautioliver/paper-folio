// Versión de un documento para la `key` de su formulario de edición en el panel (#50).
//
// Con `cacheComponents`, Next guarda en `<Activity>` el DOM y el estado de las rutas visitadas: al volver a
// editar, los campos no controlados (y el estado de `useActionState`) seguían con lo de la visita anterior,
// aunque el servidor mandara los datos nuevos, y "Guardar" revertía el último guardado. Atar la `key` del
// formulario a la versión del documento lo vuelve a montar cuando el documento cambió, y conserva lo escrito
// si no se escribió (ver node_modules/next/dist/docs/01-app/02-guides/preserving-ui-state.md).

const SIN_FECHA = "sin-fecha";

/** La versión de un documento a partir de su fecha de última modificación (`actualizadoEn`). */
export function versionDe(actualizado: Date | string | null | undefined): string {
  if (actualizado === null || actualizado === undefined) return SIN_FECHA;
  const ms = new Date(actualizado).getTime();
  return Number.isNaN(ms) ? SIN_FECHA : String(ms);
}

/** La versión del formulario de un alta (no hay documento todavía). */
export const VERSION_NUEVO = "nuevo";
