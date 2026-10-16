import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";
import { esUrlHttp } from "@/lib/contenido-esquemas";

const demoSchema = new Schema(
  {
    proyecto: { type: Schema.Types.ObjectId, ref: "Proyecto", required: true },
    titulo: { type: String, required: true, trim: true },
    // Va en un iframe y en un enlace: solo http o https.
    url: { type: String, required: true, trim: true, validate: { validator: esUrlHttp, message: "debe ser una URL http o https" } },
    descripcion: { type: String, default: "", trim: true },
    activa: { type: Boolean, default: true },
    orden: { type: Number, default: 0 },
  },
  // Sin autoIndex ni autoCreate (ver Proyecto).
  {
    timestamps: { createdAt: "creadaEn", updatedAt: "actualizadaEn" } as const,
    autoIndex: false,
    autoCreate: false,
  },
);

// Las demos activas de un proyecto, en orden.
demoSchema.index({ proyecto: 1, activa: 1, orden: 1 });

export type DemoDoc = InferSchemaType<typeof demoSchema>;

export const Demo: Model<DemoDoc> =
  (mongoose.models.Demo as Model<DemoDoc> | undefined) ?? mongoose.model<DemoDoc>("Demo", demoSchema, "demos");
