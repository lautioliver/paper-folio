import type { RechazoCambio } from "./acceso";
import { leerAdminEmails } from "./env";
import type { Rol } from "@/models/Usuario";

// Administración de los usuarios registrados desde el panel (#49). STUB
export const POR_PAGINA = 20;

export type UsuarioAdmin = {
  id: string;
  nombre: string;
  email: string;
  rol: Rol;
  porEntorno: boolean;
  bloqueado: boolean;
  accesos: number;
  creadoEn: Date | null;
  ultimoAcceso: Date | null;
};

export type PaginaUsuarios = { usuarios: UsuarioAdmin[]; total: number; pagina: number; paginas: number };

export type ResultadoUsuario = { ok: true } | { ok: false; error: RechazoCambio | "invalido" | "no-encontrado" };

export function patronDeBusqueda(q: string): RegExp {
  return new RegExp(q, "i");
}

export async function listarUsuarios(
  filtros: { q: string; pagina: number },
  adminEmails: string = leerAdminEmails(),
): Promise<PaginaUsuarios> {
  void filtros;
  void adminEmails;
  return { usuarios: [], total: 0, pagina: 1, paginas: 1 };
}

export async function cambiarRolUsuario(
  actorId: string,
  id: unknown,
  rol: unknown,
  adminEmails: string = leerAdminEmails(),
): Promise<ResultadoUsuario> {
  void [actorId, id, rol, adminEmails];
  return { ok: true };
}

export async function cambiarBloqueoUsuario(
  actorId: string,
  id: unknown,
  bloqueado: unknown,
  adminEmails: string = leerAdminEmails(),
): Promise<ResultadoUsuario> {
  void [actorId, id, bloqueado, adminEmails];
  return { ok: true };
}
