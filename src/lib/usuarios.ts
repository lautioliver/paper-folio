import mongoose from "mongoose";
import { z } from "zod";
import { emailsDeLista, type EstadoRol } from "./acceso";
import { registrarAcceso } from "./accesos";
import { asegurarIndicesDe, conectar } from "./db";
import { leerAdminEmails } from "./env";
import { Usuario, type Rol } from "@/models/Usuario";

// Usuarios registrados (ADR-002 con la enmienda de #49): el rol guardado en `usuarios` es la fuente de verdad y
// se edita desde /panel/usuarios. Los emails de `ADMIN_EMAILS` son admin siempre, pero ese admin no se guarda:
// se suma al leer, así sacar a alguien de la lista le quita el rol aunque su sesión siga viva.

export type DatosIngreso = { email: string; nombre?: string | null; imagen?: string | null };
export type UsuarioIngresado = { id: string; email: string; rol: Rol };

export class CuentaBloqueadaError extends Error {
  name = "CuentaBloqueadaError";
}

const emailValido = z.string().trim().toLowerCase().pipe(z.email());

/** Si el email está en `ADMIN_EMAILS` (lista separada por comas). */
export function esAdminPorEntorno(email: string, adminEmails: string): boolean {
  return emailsDeLista(adminEmails).has(email.trim().toLowerCase());
}

/** Rol vigente: `admin` si el email está en `ADMIN_EMAILS`; si no, el guardado. */
export function rolVigente(email: string, guardado: Rol, adminEmails: string): Rol {
  return esAdminPorEntorno(email, adminEmails) ? "admin" : guardado;
}

/**
 * Antes de #49 el rol guardado no valía: se recalculaba con `ADMIN_EMAILS` y `OPERADOR_EMAILS` en cada
 * lectura, así que un documento de entonces puede tener el rol de alguien que salió de una lista y no volvió
 * a ingresar. Esos documentos se reconocen porque no tienen `bloqueado`, y se pasan a `usuario` (sin bloquear,
 * con los accesos que tengan o 0). Idempotente: un documento ya normalizado no se vuelve a tocar.
 */
export async function normalizarLegados(filtro: { email?: string } = {}): Promise<void> {
  await Usuario.updateMany(
    { ...filtro, bloqueado: { $exists: false } },
    { $set: { rol: "usuario", bloqueado: false }, $max: { accesos: 0 } },
  );
}

/** Rol guardado de un documento leído con `lean()`: a uno de antes de #49 no se le cree (ver `normalizarLegados`). */
export function rolGuardado(doc: { rol: Rol; bloqueado?: boolean | null }): Rol {
  return typeof doc.bloqueado === "boolean" ? doc.rol : "usuario";
}

/**
 * Crea o actualiza el usuario que acaba de ingresar con Google (upsert por email). No toca el rol guardado
 * (lo asigna el panel); devuelve el vigente, con `admin` si el email está en `ADMIN_EMAILS`. Una cuenta
 * bloqueada no llega acá (la frena el callback `signIn`), pero si llega, lanza `CuentaBloqueadaError` sin contar
 * el acceso. Si no, cuenta un acceso de tipo `ingreso` (`registrarAcceso`, que nunca lanza).
 */
export async function registrarIngreso(
  datos: DatosIngreso,
  adminEmails: string = leerAdminEmails(),
): Promise<UsuarioIngresado> {
  const email = emailValido.parse(datos.email);
  await conectar();
  await asegurarIndicesDe(Usuario);
  await normalizarLegados({ email });
  const doc = await Usuario.findOneAndUpdate(
    { email },
    {
      $set: { nombre: datos.nombre ?? "", imagen: datos.imagen ?? "", ultimoAcceso: new Date() },
      $setOnInsert: { email },
    },
    { upsert: true, returnDocument: "after", runValidators: true, setDefaultsOnInsert: true },
  ).lean();
  if (doc.bloqueado === true) throw new CuentaBloqueadaError("La cuenta está bloqueada.");
  const id = String(doc._id);
  // Cuenta el ingreso (#54). No lanza: si la base falla al contar, el ingreso sigue.
  await registrarAcceso(id, "ingreso");
  return { id, email: doc.email, rol: rolVigente(doc.email, rolGuardado(doc), adminEmails) };
}

/**
 * Estado de un usuario para los permisos (ADR-002 R-3): su rol vigente, `"bloqueado"` o `null` si no existe.
 * Se lee en cada página, acción o API protegida: un cambio de rol o un bloqueo vale al instante.
 */
export async function buscarRol(id: string, adminEmails: string = leerAdminEmails()): Promise<EstadoRol> {
  if (!mongoose.isValidObjectId(id)) return null;
  await conectar();
  const doc = await Usuario.findById(id, { email: 1, rol: 1, bloqueado: 1 }).lean();
  if (!doc) return null;
  if (doc.bloqueado === true) return "bloqueado";
  return rolVigente(doc.email, rolGuardado(doc), adminEmails);
}

/** Si la cuenta de ese email está bloqueada (para el callback `signIn`). `false` si no existe. */
export async function usuarioBloqueado(email: string): Promise<boolean> {
  await conectar();
  const doc = await Usuario.exists({ email: email.trim().toLowerCase(), bloqueado: true });
  return doc !== null;
}
