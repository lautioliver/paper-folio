import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

// Visitantes únicos por día (épica #53, decisión 2). `idHash` es `sha256(id + fecha)` del id de la cookie
// anónima `pf_v`: nunca se guarda el id ni la IP, y el mismo visitante no se puede seguir entre días.
const visitanteDiarioSchema = new Schema(
  {
    fecha: { type: String, required: true },
    idHash: { type: String, required: true },
  },
  // Igual que Consulta: sin autoIndex ni autoCreate (ver `conectar()`); el índice lo crea
  // `asegurarIndicesDe(VisitanteDiario)` en src/lib/visitas.ts.
  { collection: "visitantes_diarios", versionKey: false, autoIndex: false, autoCreate: false },
);

// Un único por día: el insert de un visitante que ya vino ese día choca con la clave y se ignora.
visitanteDiarioSchema.index({ fecha: 1, idHash: 1 }, { unique: true });

export type VisitanteDiarioDoc = InferSchemaType<typeof visitanteDiarioSchema>;

export const VisitanteDiario: Model<VisitanteDiarioDoc> =
  (mongoose.models.VisitanteDiario as Model<VisitanteDiarioDoc> | undefined) ??
  mongoose.model<VisitanteDiarioDoc>("VisitanteDiario", visitanteDiarioSchema);
