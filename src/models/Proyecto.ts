import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";
import { TONES } from "@/components/sitio/tones";
import { SLUG } from "@/lib/contenido-esquemas";

const casoSchema = new Schema(
  {
    problema: { type: String, required: true, trim: true },
    solucion: { type: String, required: true, trim: true },
    funcionalidades: { type: [String], default: [] },
    stack: { type: [String], default: [] },
  },
  { _id: false },
);

const proyectoSchema = new Schema(
  {
    slug: { type: String, required: true, trim: true, match: SLUG },
    nombre: { type: String, required: true, trim: true },
    inicial: { type: String, required: true, trim: true, minlength: 1, maxlength: 2 },
    categoria: { type: String, required: true, trim: true },
    descripcion: { type: String, required: true, trim: true },
    stack: { type: [String], default: [] },
    repoUrl: { type: String, required: true, trim: true },
    acento: { type: String, enum: TONES, required: true },
    caso: { type: casoSchema, required: true },
    imagen: { type: String, trim: true },
    orden: { type: Number, default: 0 },
    publicado: { type: Boolean, default: false },
  },
  // Igual que Consulta y Usuario: sin autoIndex ni autoCreate (ver `conectar()`). Los índices los crea
  // `asegurarIndicesDe(Proyecto)` quien escribe (el seed y, después, el panel).
  {
    timestamps: { createdAt: "creadoEn", updatedAt: "actualizadoEn" },
    autoIndex: false,
    autoCreate: false,
  },
);

proyectoSchema.index({ slug: 1 }, { unique: true });

export type ProyectoDoc = InferSchemaType<typeof proyectoSchema>;

export const Proyecto: Model<ProyectoDoc> =
  (mongoose.models.Proyecto as Model<ProyectoDoc> | undefined) ??
  mongoose.model<ProyectoDoc>("Proyecto", proyectoSchema, "proyectos");
