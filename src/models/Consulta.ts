import mongoose, { Schema, type InferSchemaType } from "mongoose";
import { CONTACT_TYPES } from "@/lib/contact";

const consultaSchema = new Schema(
  {
    nombre: { type: String, required: true },
    email: { type: String, required: true },
    tipo: { type: String, enum: CONTACT_TYPES, required: true },
    mensaje: { type: String, required: true },
    estado: { type: String, default: "nueva" },
    emailEnviado: { type: Boolean, default: false },
    ipHash: { type: String, required: true },
  },
  // Con `bufferCommands: false` (ver `conectar()`), el autoIndex y el autoCreate al registrar el
  // modelo corren sin conexión y fallan. `asegurarIndices()` (src/lib/consultas.ts) crea el índice.
  {
    timestamps: { createdAt: "creadaEn", updatedAt: false },
    autoIndex: false,
    autoCreate: false,
  },
);

// Para contar las consultas de una IP en la última hora.
consultaSchema.index({ ipHash: 1, creadaEn: -1 });

export type ConsultaDoc = InferSchemaType<typeof consultaSchema>;

export const Consulta = mongoose.models.Consulta ?? mongoose.model<ConsultaDoc>("Consulta", consultaSchema);
