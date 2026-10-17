import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

export const TIPOS_ACCESO = ["ingreso", "detalle"] as const;
export type TipoAcceso = (typeof TIPOS_ACCESO)[number];

// Accesos de usuarios registrados por día y por tipo (épica #53, decisión 3): `ingreso` es cada ingreso con
// Google y `detalle`, cada vista de un caso de estudio. `fecha` es el día en America/Argentina/Salta
// (YYYY-MM-DD) y `total` se suma con `$inc` atómico (`registrarAcceso`, src/lib/accesos.ts).
const accesoDiarioSchema = new Schema(
  {
    fecha: { type: String, required: true },
    tipo: { type: String, enum: TIPOS_ACCESO, required: true },
    total: { type: Number, required: true, default: 0 },
  },
  // Igual que Consulta: sin autoIndex ni autoCreate (ver `conectar()`); el índice lo crea
  // `asegurarIndicesDe(AccesoDiario)` en src/lib/accesos.ts.
  { collection: "accesos_diarios", versionKey: false, autoIndex: false, autoCreate: false },
);

// Un documento por día y tipo: el upsert con `$inc` nunca duplica el contador.
accesoDiarioSchema.index({ fecha: 1, tipo: 1 }, { unique: true });

export type AccesoDiarioDoc = InferSchemaType<typeof accesoDiarioSchema>;

export const AccesoDiario: Model<AccesoDiarioDoc> =
  (mongoose.models.AccesoDiario as Model<AccesoDiarioDoc> | undefined) ??
  mongoose.model<AccesoDiarioDoc>("AccesoDiario", accesoDiarioSchema);
