import mongoose from "mongoose";
import { z } from "zod";
import { asegurarIndicesDe, conectar } from "./db";
import { leerAuthRoles } from "./env";
import { Usuario, type Rol } from "@/models/Usuario";

/** Emails separados por comas (`ADMIN_EMAILS`, `OPERADOR_EMAILS`). */
export type ListasDeRoles = { admin: string; operador: string };
export type DatosIngreso = { email: string; nombre?: string | null; imagen?: string | null };
export type UsuarioIngresado = { id: string; email: string; rol: Rol };

const emailValido = z.string().trim().toLowerCase().pipe(z.email());

function emailsDe(lista: string): Set<string> {
  return new Set(
    lista
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  );
}

/** Rol que le toca a un email según las listas del entorno. Si está en las dos, gana admin. */
export function rolParaEmail(email: string, listas: ListasDeRoles): Rol {
  const normal = email.trim().toLowerCase();
  if (emailsDe(listas.admin).has(normal)) return "admin";
  if (emailsDe(listas.operador).has(normal)) return "operador";
  return "usuario";
}

/**
 * Crea o actualiza el usuario que acaba de ingresar con Google (upsert por email).
 * El rol se recalcula en cada ingreso según `ADMIN_EMAILS` y `OPERADOR_EMAILS` (épica #31, decisión 3).
 */
export async function registrarIngreso(
  datos: DatosIngreso,
  listas: ListasDeRoles = leerAuthRoles(),
): Promise<UsuarioIngresado> {
  const email = emailValido.parse(datos.email);
  const rol = rolParaEmail(email, listas);
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

/**
 * Rol vigente de un usuario para los permisos. `null` si no existe.
 * Hasta el hito 5 los roles salen de `ADMIN_EMAILS` y `OPERADOR_EMAILS` (ADR-002 R-4): se recalculan
 * también al leer, así sacar a alguien de la lista le quita el rol aunque su sesión siga viva.
 */
export async function buscarRol(id: string, listas: ListasDeRoles = leerAuthRoles()): Promise<Rol | null> {
  if (!mongoose.isValidObjectId(id)) return null;
  await conectar();
  const doc = await Usuario.findById(id, { email: 1 }).lean();
  return doc ? rolParaEmail(doc.email, listas) : null;
}
