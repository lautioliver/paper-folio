import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

export const ROLES = ["usuario", "operador", "admin"] as const;
export type Rol = (typeof ROLES)[number];

const usuarioSchema = new Schema(
  {
    email: { type: String, required: true, lowercase: true, trim: true },
    nombre: { type: String, default: "" },
    imagen: { type: String, default: "" },
    rol: { type: String, enum: ROLES, default: "usuario", required: true },
    ultimoAcceso: { type: Date, required: true },
    // #49. Sin `required`: los documentos de antes no los tienen (ver `normalizarLegados` en src/lib/usuarios.ts).
    bloqueado: { type: Boolean, default: false },
    // Ingresos contados con `$inc` (hito 6, D2). Acá solo se muestra.
    accesos: { type: Number, default: 0, min: 0 },
  },
  // Igual que Consulta: sin autoIndex ni autoCreate (ver `conectar()`); el índice lo crea `asegurarIndices()`
  // en src/lib/usuarios.ts.
  {
    timestamps: { createdAt: "creadoEn", updatedAt: false },
    autoIndex: false,
    autoCreate: false,
  },
);

usuarioSchema.index({ email: 1 }, { unique: true });

export type UsuarioDoc = InferSchemaType<typeof usuarioSchema>;

export const Usuario: Model<UsuarioDoc> =
  (mongoose.models.Usuario as Model<UsuarioDoc> | undefined) ??
  mongoose.model<UsuarioDoc>("Usuario", usuarioSchema);
