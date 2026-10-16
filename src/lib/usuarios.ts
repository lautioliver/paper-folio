import mongoose from "mongoose";
import { z } from "zod";
import { emailsDeLista, type EstadoRol } from "./acceso";
import { asegurarIndicesDe, conectar } from "./db";
import { leerAdminEmails } from "./env";
import { Usuario, type Rol } from "@/models/Usuario";

export type DatosIngreso = { email: string; nombre?: string | null; imagen?: string | null };
export type UsuarioIngresado = { id: string; email: string; rol: Rol };

const emailValido = z.string().trim().toLowerCase().pipe(z.email());

/** Si el email está en `ADMIN_EMAILS` (lista separada por comas). */
export function esAdminPorEntorno(email: string, adminEmails: string): boolean {
  return emailsDeLista(adminEmails).has(email.trim().toLowerCase());
}

/** Rol vigente: `admin` si el email está en `ADMIN_EMAILS`; si no, el guardado. STUB */
export function rolVigente(email: string, guardado: Rol, adminEmails: string): Rol {
  void email;
  void adminEmails;
  return guardado;
}

/** STUB */
export async function normalizarLegados(): Promise<void> {}

/** STUB: todavía recalcula con las listas. */
export async function registrarIngreso(
  datos: DatosIngreso,
  adminEmails: string = leerAdminEmails(),
): Promise<UsuarioIngresado> {
  const email = emailValido.parse(datos.email);
  const rol: Rol = esAdminPorEntorno(email, adminEmails) ? "admin" : "usuario";
  await conectar();
  await asegurarIndicesDe(Usuario);
  const doc = await Usuario.findOneAndUpdate(
    { email },
    {
      $set: { nombre: datos.nombre ?? "", imagen: datos.imagen ?? "", rol, ultimoAcceso: new Date() },
      $setOnInsert: { email },
    },
    { upsert: true, returnDocument: "after", runValidators: true, setDefaultsOnInsert: true },
  ).lean();
  return { id: String(doc._id), email: doc.email, rol: doc.rol };
}

/** STUB */
export async function buscarRol(id: string, adminEmails: string = leerAdminEmails()): Promise<EstadoRol> {
  if (!mongoose.isValidObjectId(id)) return null;
  await conectar();
  const doc = await Usuario.findById(id, { email: 1 }).lean();
  return doc ? (esAdminPorEntorno(doc.email, adminEmails) ? "admin" : "usuario") : null;
}

/** STUB */
export async function usuarioBloqueado(email: string): Promise<boolean> {
  void email;
  return false;
}
