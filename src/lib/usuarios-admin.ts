import { z } from "zod";
import { emailsDeLista, revisarCambio, type CambioUsuario, type RechazoCambio } from "./acceso";
import { asegurarIndicesDe, conectar } from "./db";
import { leerAdminEmails } from "./env";
import { normalizarLegados } from "./usuarios";
import { ROLES, Usuario, type Rol } from "@/models/Usuario";

// Administración de los usuarios registrados desde el panel (#49, enmienda de ADR-002 R-4). Solo para admin:
// las páginas y las server actions exigen el rol antes de llamar acá. Las reglas (no a uno mismo, no a
// ADMIN_EMAILS, no al último admin) están en `revisarCambio` (src/lib/acceso.ts).

export const POR_PAGINA = 20;
const LARGO_BUSQUEDA = 100;

/** Un usuario como lo ve el panel: sin la imagen ni nada más de la cuenta de Google. */
export type UsuarioAdmin = {
  id: string;
  nombre: string;
  email: string;
  /** El vigente: `admin` si el email está en `ADMIN_EMAILS`. */
  rol: Rol;
  /** Si el email está en `ADMIN_EMAILS` (admin siempre: no se degrada ni se bloquea desde el panel). */
  porEntorno: boolean;
  bloqueado: boolean;
  accesos: number;
  creadoEn: Date | null;
  ultimoAcceso: Date | null;
};

export type PaginaUsuarios = { usuarios: UsuarioAdmin[]; total: number; pagina: number; paginas: number };

export type ResultadoUsuario = { ok: true } | { ok: false; error: RechazoCambio | "invalido" | "no-encontrado" };

// Solo el formato hexadecimal de 24: `isValidObjectId` acepta cualquier cadena de 12 caracteres.
const idValido = z.string().regex(/^[0-9a-f]{24}$/i);
const rolValido = z.enum(ROLES);
const INVALIDO: ResultadoUsuario = { ok: false, error: "invalido" };

/** Regex literal de la búsqueda, sin distinguir mayúsculas: se escapan todos los caracteres especiales. */
export function patronDeBusqueda(q: string): RegExp {
  return new RegExp(q.replace(/[.*+?^${}()|[\]\\/-]/g, "\\$&"), "i");
}

/** Los usuarios, los más nuevos primero, de a `POR_PAGINA`. Una página de más devuelve la última. */
export async function listarUsuarios(
  filtros: { q: string; pagina: number },
  adminEmails: string = leerAdminEmails(),
): Promise<PaginaUsuarios> {
  const q = filtros.q.trim().slice(0, LARGO_BUSQUEDA);
  await conectar();
  await asegurarIndicesDe(Usuario);
  await normalizarLegados();
  const filtro = q ? { $or: [{ nombre: patronDeBusqueda(q) }, { email: patronDeBusqueda(q) }] } : {};
  const total = await Usuario.countDocuments(filtro);
  const paginas = Math.max(1, Math.ceil(total / POR_PAGINA));
  const pedida = Number.isSafeInteger(filtros.pagina) && filtros.pagina > 0 ? filtros.pagina : 1;
  const pagina = Math.min(pedida, paginas);
  const docs = await Usuario.find(filtro, { email: 1, nombre: 1, rol: 1, bloqueado: 1, accesos: 1, creadoEn: 1, ultimoAcceso: 1 })
    .sort({ creadoEn: -1, _id: -1 })
    .skip((pagina - 1) * POR_PAGINA)
    .limit(POR_PAGINA)
    .lean();
  const admins = emailsDeLista(adminEmails);
  const usuarios = docs.map((d) => {
    const porEntorno = admins.has(d.email);
    return {
      id: String(d._id),
      nombre: d.nombre ?? "",
      email: d.email,
      rol: porEntorno ? "admin" : d.rol,
      porEntorno,
      bloqueado: d.bloqueado === true,
      accesos: d.accesos ?? 0,
      creadoEn: d.creadoEn ?? null,
      ultimoAcceso: d.ultimoAcceso ?? null,
    } satisfies UsuarioAdmin;
  });
  return { usuarios, total, pagina, paginas };
}

/**
 * Admins vigentes (sin bloquear), sin contar `excluir`: los emails de `ADMIN_EMAILS` (hayan ingresado o no)
 * más los que tienen `admin` guardado.
 */
async function contarAdmins(admins: Set<string>, excluir?: string): Promise<number> {
  const deEntorno = [...admins].filter((e) => e !== excluir);
  const [bloqueadosDeEntorno, guardados] = await Promise.all([
    deEntorno.length ? Usuario.countDocuments({ email: { $in: deEntorno }, bloqueado: true }) : 0,
    Usuario.countDocuments({
      rol: "admin",
      bloqueado: false,
      email: { $nin: excluir ? [...admins, excluir] : [...admins] },
    }),
  ]);
  return deEntorno.length - bloqueadosDeEntorno + guardados;
}

type Campos = { rol?: Rol; bloqueado?: boolean };

async function aplicar(actorId: string, id: unknown, cambio: CambioUsuario, adminEmails: string): Promise<ResultadoUsuario> {
  const idOk = idValido.safeParse(id);
  if (!idOk.success) return INVALIDO;
  await conectar();
  await normalizarLegados();
  const doc = await Usuario.findById(idOk.data, { email: 1, rol: 1, bloqueado: 1 }).lean();
  if (!doc) return { ok: false, error: "no-encontrado" };
  const admins = emailsDeLista(adminEmails);
  const porEntorno = admins.has(doc.email);
  const objetivo = { id: String(doc._id), rol: porEntorno ? "admin" : doc.rol, bloqueado: doc.bloqueado === true, porEntorno };
  const rechazo = revisarCambio({ actorId, objetivo, cambio, otrosAdmins: await contarAdmins(admins, doc.email) });
  if (rechazo) return { ok: false, error: rechazo };

  const nuevo: Campos = cambio.tipo === "rol" ? { rol: cambio.rol } : { bloqueado: cambio.bloqueado };
  const previo: Campos = cambio.tipo === "rol" ? { rol: doc.rol } : { bloqueado: doc.bloqueado === true };
  await Usuario.updateOne({ _id: idOk.data }, { $set: nuevo }, { runValidators: true });
  // Dos admins que se quitan el rol entre sí a la vez pasan los dos el chequeo de arriba (no hay
  // transacción): si después de escribir no queda ningún admin, se deshace.
  if ((await contarAdmins(admins)) < 1) {
    await Usuario.updateOne({ _id: idOk.data }, { $set: previo });
    return { ok: false, error: "ultimo-admin" };
  }
  return { ok: true };
}

/** Cambia el rol guardado de un usuario. `actorId` es el admin de la sesión. */
export async function cambiarRolUsuario(
  actorId: string,
  id: unknown,
  rol: unknown,
  adminEmails: string = leerAdminEmails(),
): Promise<ResultadoUsuario> {
  const rolOk = rolValido.safeParse(rol);
  if (!rolOk.success) return INVALIDO;
  return aplicar(actorId, id, { tipo: "rol", rol: rolOk.data }, adminEmails);
}

/** Bloquea (`true`) o desbloquea (`false`) la cuenta. Bloqueada, no ingresa y sus sesiones pierden los permisos. */
export async function cambiarBloqueoUsuario(
  actorId: string,
  id: unknown,
  bloqueado: unknown,
  adminEmails: string = leerAdminEmails(),
): Promise<ResultadoUsuario> {
  const ok = z.boolean().safeParse(bloqueado);
  if (!ok.success) return INVALIDO;
  return aplicar(actorId, id, { tipo: "bloqueo", bloqueado: ok.data }, adminEmails);
}
