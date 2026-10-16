import { createHash } from "node:crypto";
import { Consulta } from "@/models/Consulta";
import type { ContactField, ContactRequest } from "./contact";
import { parseContactRequest } from "./contact";
import { asegurarIndicesDe, conectar } from "./db";
import { avisarConsultaNueva } from "./email";
import { leerIpHashSal } from "./env";

export const LIMITE_POR_HORA = 5;
const UNA_HORA_MS = 60 * 60 * 1000;

export type ConsultaCreada = { id: string } & ContactRequest;

export type ResultadoConsulta =
  | { tipo: "creada"; consulta: ConsultaCreada }
  | { tipo: "invalida"; errores: Partial<Record<ContactField, string>> }
  | { tipo: "limite" }
  | { tipo: "descartada" };

export type OpcionesConsulta = {
  /** IP del visitante. Solo se guarda su hash SHA-256 con `IP_HASH_SAL`. */
  ip: string;
  /**
   * Se llama con la consulta ya guardada; por defecto manda el email (`avisarConsultaNueva`).
   * Si sale bien, la consulta queda con `emailEnviado: true`; si falla, queda en `false` y igual
   * se devuelve `creada`.
   */
  avisar?: (consulta: ConsultaCreada) => Promise<void> | void;
  /** Reloj inyectable para los tests. */
  ahora?: () => Date;
};

function nombreDe(error: unknown): string {
  return error instanceof Error ? error.name : "error";
}

/** El campo trampa `sitio_web` está oculto en el formulario: cualquier valor no vacío es un bot. */
function traeTrampa(input: unknown): boolean {
  if (typeof input !== "object" || input === null) return false;
  const valor = (input as Record<string, unknown>).sitio_web;
  if (valor === undefined || valor === null) return false;
  return typeof valor === "string" ? valor.trim() !== "" : true;
}

/**
 * Valida, aplica el antispam y guarda una consulta de contacto.
 * El campo trampa se mira antes de validar: un bot con datos inválidos recibe el mismo "éxito"
 * que uno válido y no aprende nada. El límite es de `LIMITE_POR_HORA` por IP; cuenta solo las
 * guardadas. Contar y guardar no son atómicos: en ráfagas concurrentes puede pasarse por poco.
 */
export async function crearConsulta(
  input: unknown,
  opciones: OpcionesConsulta,
): Promise<ResultadoConsulta> {
  // Error de programación del llamador (no leyó la IP): sin la IP, todos caerían en un mismo balde.
  const ip = opciones.ip.trim();
  if (ip === "") throw new Error("crearConsulta: falta la IP de la consulta");
  if (traeTrampa(input)) return { tipo: "descartada" };

  const parsed = parseContactRequest(input);
  if (!parsed.ok) return { tipo: "invalida", errores: parsed.errors };

  const sal = leerIpHashSal();
  const ipHash = createHash("sha256")
    .update(sal + ip)
    .digest("hex");
  const ahora = opciones.ahora?.() ?? new Date();

  await conectar();
  try {
    await asegurarIndicesDe(Consulta);
  } catch (error) {
    // Sin los índices la consulta se guarda igual (el conteo por IP es más lento); se reintenta en la próxima.
    // El formulario público no puede fallar por esto. Solo el nombre: el mensaje puede traer la URI.
    console.error("crearConsulta: no se pudo crear el índice de consultas:", nombreDe(error));
  }

  const recientes = await Consulta.countDocuments({
    ipHash,
    creadaEn: { $gte: new Date(ahora.getTime() - UNA_HORA_MS) },
  });
  if (recientes >= LIMITE_POR_HORA) return { tipo: "limite" };

  const doc = await Consulta.create({
    nombre: parsed.data.name,
    email: parsed.data.email,
    tipo: parsed.data.type,
    mensaje: parsed.data.message,
    ipHash,
    creadaEn: ahora,
  });
  const consulta: ConsultaCreada = { id: String(doc._id), ...parsed.data };
  let avisada = false;
  try {
    await (opciones.avisar ?? avisarConsultaNueva)(consulta);
    avisada = true;
  } catch (error) {
    // Solo el nombre del error: el mensaje puede traer la clave o datos del visitante.
    console.error("crearConsulta: no se pudo avisar la consulta nueva por email:", nombreDe(error));
  }
  if (avisada) {
    try {
      await Consulta.findByIdAndUpdate(doc._id, { emailEnviado: true });
    } catch (error) {
      // El email ya salió: la consulta queda con `emailEnviado: false` aunque se avisó.
      console.error(
        "crearConsulta: el email salió pero no se pudo marcar emailEnviado:",
        nombreDe(error),
      );
    }
  }
  return { tipo: "creada", consulta };
}
