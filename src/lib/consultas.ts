import { createHash } from "node:crypto";
import mongoose from "mongoose";
import { Consulta } from "@/models/Consulta";
import type { ContactField, ContactRequest } from "./contact";
import { parseContactRequest } from "./contact";
import { conectar } from "./db";
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
  /** Se llama con la consulta ya guardada (el email, issue B). Por ahora no hace nada. */
  avisar?: (consulta: ConsultaCreada) => Promise<void> | void;
  /** Reloj inyectable para los tests. */
  ahora?: () => Date;
};

let indices: Promise<unknown> | null = null;
let escuchando = false;

/** Crea el índice de `consultas` una vez por proceso (el modelo no lo hace solo, ver `Consulta.ts`). */
function asegurarIndices(): Promise<unknown> {
  // Al cerrarse la conexión (como en db.ts) el índice puede faltar en la próxima base.
  if (!escuchando) {
    escuchando = true;
    mongoose.connection.on("close", () => {
      indices = null;
    });
  }
  indices ??= Consulta.createIndexes().catch((error: unknown) => {
    indices = null;
    throw error;
  });
  return indices;
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
export async function crearConsulta(input: unknown, opciones: OpcionesConsulta): Promise<ResultadoConsulta> {
  // Error de programación del llamador (no leyó la IP): sin la IP, todos caerían en un mismo balde.
  if (opciones.ip.trim() === "") throw new Error("crearConsulta: falta la IP de la consulta");
  if (traeTrampa(input)) return { tipo: "descartada" };

  const parsed = parseContactRequest(input);
  if (!parsed.ok) return { tipo: "invalida", errores: parsed.errors };

  const sal = leerIpHashSal();
  const ipHash = createHash("sha256")
    .update(sal + opciones.ip)
    .digest("hex");
  const ahora = opciones.ahora?.() ?? new Date();

  await conectar();
  await asegurarIndices();

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
  await opciones.avisar?.(consulta);
  return { tipo: "creada", consulta };
}
