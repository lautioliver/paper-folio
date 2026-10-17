import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

// Visitas por día y por ruta pública (épica #53, decisión 1). `fecha` es el día en America/Argentina/Salta
// (YYYY-MM-DD) y `total` se suma con `$inc` atómico (`registrarVisita`, src/lib/visitas.ts).
const visitaDiariaSchema = new Schema(
  {
    fecha: { type: String, required: true },
    ruta: { type: String, required: true },
    total: { type: Number, required: true, default: 0 },
  },
  // Igual que Consulta: sin autoIndex ni autoCreate (ver `conectar()`); el índice lo crea
  // `asegurarIndicesDe(VisitaDiaria)` en src/lib/visitas.ts.
  { collection: "visitas_diarias", versionKey: false, autoIndex: false, autoCreate: false },
);

// Un documento por día y ruta: el upsert con `$inc` nunca duplica el contador.
visitaDiariaSchema.index({ fecha: 1, ruta: 1 }, { unique: true });

export type VisitaDiariaDoc = InferSchemaType<typeof visitaDiariaSchema>;

export const VisitaDiaria: Model<VisitaDiariaDoc> =
  (mongoose.models.VisitaDiaria as Model<VisitaDiariaDoc> | undefined) ??
  mongoose.model<VisitaDiariaDoc>("VisitaDiaria", visitaDiariaSchema);
