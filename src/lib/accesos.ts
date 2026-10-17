import mongoose from "mongoose";
import { AccesoDiario, TIPOS_ACCESO, type TipoAcceso } from "@/models/AccesoDiario";
import { Usuario } from "@/models/Usuario";
import { asegurarIndicesDe, conectar } from "./db";
import { fechaDeMetrica } from "./fecha-metricas";

export type { TipoAcceso };

/**
 * Cuenta un acceso de un usuario registrado (épica #53, decisión 3): `ingreso` en cada ingreso con Google
 * (`registrarIngreso`) y `detalle` en cada vista de un caso de estudio (`verCasoDeEstudio`). Hace `$inc`
 * atómico con upsert en `accesos_diarios` (un documento por día de Salta y tipo) y `$inc` de `usuarios.accesos`.
 *
 * Nunca lanza: si la base falla, loguea solo el nombre del error (el mensaje puede traer la URI) y devuelve
 * `false`, así el ingreso o la página siguen. Con un id que no es de Mongo o un tipo desconocido no cuenta nada.
 */
export async function registrarAcceso(usuarioId: string, tipo: TipoAcceso, ahora: Date = new Date()): Promise<boolean> {
  if (!mongoose.isValidObjectId(usuarioId) || !TIPOS_ACCESO.includes(tipo)) return false;
  try {
    await conectar();
    // Sin el índice único, el upsert podría duplicar el contador del día: si no se puede crear, no se cuenta.
    await asegurarIndicesDe(AccesoDiario);
    await Promise.all([
      AccesoDiario.updateOne({ fecha: fechaDeMetrica(ahora), tipo }, { $inc: { total: 1 } }, { upsert: true }),
      Usuario.updateOne({ _id: usuarioId }, { $inc: { accesos: 1 } }),
    ]);
    return true;
  } catch (error) {
    console.error("accesos: no se pudo contar el acceso", error instanceof Error ? error.name : "desconocido");
    return false;
  }
}
