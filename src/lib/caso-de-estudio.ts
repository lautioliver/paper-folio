import { detalleProyecto, type Detalle } from "./contenido";
import { requerirSesion } from "./permisos";
import { rutaDetalle } from "./proyectos";

/** Stub (rojo). */
export async function verCasoDeEstudio(slug: string): Promise<Detalle | null> {
  await requerirSesion(rutaDetalle(slug));
  return detalleProyecto(slug);
}
