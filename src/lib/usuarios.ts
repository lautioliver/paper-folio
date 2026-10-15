import mongoose from "mongoose";
import { z } from "zod";
import { conectar } from "./db";
import { leerAuthRoles } from "./env";
import { ROLES, Usuario, type Rol } from "@/models/Usuario";

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

let indices: Promise<unknown> | null = null;
let escuchando = false;

/** Crea el índice único de email una vez por proceso (el modelo no lo hace solo, ver `Usuario.ts`). */
function asegurarIndices(): Promise<unknown> {
  if (!escuchando) {
    escuchando = true;
    mongoose.connection.on("close", () => {
      indices = null;
    });
  }
  indices ??= Usuario.createIndexes().catch((error: unknown) => {
    indices = null;
    throw error;
  });
  return indices;
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
  await asegurarIndices();
  const doc = await Usuario.findOneAndUpdate(
    { email },
    {
      $set: { nombre: datos.nombre ?? "", imagen: datos.imagen ?? "", rol, ultimoAcceso: new Date() },
      $setOnInsert: { email },
    },
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
  ).lean();
  return { id: String(doc._id), email: doc.email, rol: doc.rol };
}

/** Rol guardado en la base (la fuente de verdad para el panel). `null` si no existe. */
export async function buscarRol(id: string): Promise<Rol | null> {
  if (!mongoose.isValidObjectId(id)) return null;
  await conectar();
  const doc = await Usuario.findById(id, { rol: 1 }).lean();
  return doc && (ROLES as readonly string[]).includes(doc.rol) ? doc.rol : null;
}
