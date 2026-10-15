import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";
import { SERVICE_ICONS } from "@/content/profile";

const servicioSchema = new Schema(
  {
    titulo: { type: String, required: true, trim: true },
    descripcion: { type: String, required: true, trim: true },
    icono: { type: String, enum: SERVICE_ICONS },
    imagen: { type: String, trim: true },
    orden: { type: Number, default: 0 },
    publicado: { type: Boolean, default: false },
  },
  // Sin autoIndex ni autoCreate (ver Proyecto).
  {
    timestamps: { createdAt: "creadoEn", updatedAt: "actualizadoEn" },
    autoIndex: false,
    autoCreate: false,
  },
);

// El título identifica al servicio (el seed es idempotente por título) y es la clave de la tarjeta.
servicioSchema.index({ titulo: 1 }, { unique: true });

export type ServicioDoc = InferSchemaType<typeof servicioSchema>;

export const Servicio: Model<ServicioDoc> =
  (mongoose.models.Servicio as Model<ServicioDoc> | undefined) ??
  mongoose.model<ServicioDoc>("Servicio", servicioSchema, "servicios");
