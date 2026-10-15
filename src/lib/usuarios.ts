import type { Rol } from "@/models/Usuario";

export type ListasDeRoles = { admin: string; operador: string };
export type DatosIngreso = { email: string; nombre?: string | null; imagen?: string | null };
export type UsuarioIngresado = { id: string; email: string; rol: Rol };

// Stub: los tests se escriben antes que la lógica.
export function rolParaEmail(_email: string, _listas: ListasDeRoles): Rol {
  return "usuario";
}

export async function registrarIngreso(_datos: DatosIngreso, _listas?: ListasDeRoles): Promise<UsuarioIngresado> {
  return { id: "", email: "", rol: "usuario" };
}

export async function buscarRol(_id: string): Promise<Rol | null> {
  return null;
}
