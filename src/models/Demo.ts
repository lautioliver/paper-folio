import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const demoSchema = new Schema(
  {
    proyecto: { type: Schema.Types.ObjectId, ref: "Proyecto", required: true },
    titulo: { type: String, required: true, trim: true },
    url: { type: String, required: true, trim: true },
    descripcion: { type: String, default: "", trim: true },
    activa: { type: Boolean, default: true },
    orden: { type: Number, default: 0 },
  },
  // Sin autoIndex ni autoCreate (ver Proyecto).
  {
    timestamps: { createdAt: "creadaEn", updatedAt: "actualizadaEn" },
    autoIndex: false,
    autoCreate: false,
  },
);

// Las demos activas de un proyecto, en orden.
demoSchema.index({ proyecto: 1, activa: 1, orden: 1 });

export type DemoDoc = InferSchemaType<typeof demoSchema>;

export const Demo: Model<DemoDoc> =
  (mongoose.models.Demo as Model<DemoDoc> | undefined) ?? mongoose.model<DemoDoc>("Demo", demoSchema, "demos");
