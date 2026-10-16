import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";
import { CONTACT_TYPES } from "@/lib/contact";
import { ESTADOS_CONSULTA } from "@/lib/estados-consulta";

export const TIPOS_SEGUIMIENTO = ["nota", "respuesta", "estado"] as const;

// Una entrada del historial de la consulta (épica #36, decisión 3). En las de tipo `estado`, `texto` es el
// estado nuevo (`en_curso`, …). `emailEnviado` solo lo usan las respuestas (#40).
const entradaSeguimientoSchema = new Schema(
  {
    tipo: { type: String, enum: TIPOS_SEGUIMIENTO, required: true },
    texto: { type: String, required: true },
    autor: { type: Schema.Types.ObjectId, ref: "Usuario", required: true },
    fecha: { type: Date, required: true },
    emailEnviado: { type: Boolean },
  },
  { _id: false },
);

const consultaSchema = new Schema(
  {
    nombre: { type: String, required: true },
    email: { type: String, required: true },
    tipo: { type: String, enum: CONTACT_TYPES, required: true },
    mensaje: { type: String, required: true },
    // Los documentos de antes de #39 ya tienen `nueva`; los que no traen `seguimiento` lo leen vacío.
    estado: { type: String, enum: ESTADOS_CONSULTA, default: "nueva", required: true },
    emailEnviado: { type: Boolean, default: false },
    ipHash: { type: String, required: true },
    seguimiento: { type: [entradaSeguimientoSchema], default: [] },
  },
  // Con `bufferCommands: false` (ver `conectar()`), el autoIndex y el autoCreate al registrar el
  // modelo corren sin conexión y fallan. `asegurarIndicesDe(Consulta)` crea los índices en el primer uso
  // (`crearConsulta` en src/lib/consultas.ts y `listarConsultas` en src/lib/bandeja.ts).
  {
    timestamps: { createdAt: "creadaEn", updatedAt: false },
    autoIndex: false,
    autoCreate: false,
  },
);

// Para contar las consultas de una IP en la última hora.
consultaSchema.index({ ipHash: 1, creadaEn: -1 });
// Para el orden de la bandeja (`listarConsultas`, src/lib/bandeja.ts).
consultaSchema.index({ creadaEn: -1, _id: -1 });

export type ConsultaDoc = InferSchemaType<typeof consultaSchema>;

export const Consulta: Model<ConsultaDoc> =
  (mongoose.models.Consulta as Model<ConsultaDoc> | undefined) ??
  mongoose.model<ConsultaDoc>("Consulta", consultaSchema);
