import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";
import { SERVICE_ICONS } from "@/content/profile";
import { esUrlHttps } from "@/lib/contenido-esquemas";

const servicioSchema = new Schema(
  {
    titulo: { type: String, required: true, trim: true },
    descripcion: { type: String, required: true, trim: true },
    // Un ícono de los actuales (`ServiceIcon`) o una imagen: sin ninguno de los dos, falta el ícono.
    icono: {
      type: String,
      enum: SERVICE_ICONS,
      required: function (this: { imagen?: string | null }) {
        return !this.imagen;
      },
    },
    imagen: { type: String, trim: true, validate: { validator: esUrlHttps, message: "debe ser una URL https" } },
    orden: { type: Number, default: 0 },
    publicado: { type: Boolean, default: false },
  },
  // Sin autoIndex ni autoCreate (ver Proyecto).
  {
    timestamps: { createdAt: "creadoEn", updatedAt: "actualizadoEn" } as const,
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
