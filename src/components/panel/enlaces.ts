import type { Rol } from "@/models/Usuario";

// STUB (tests en rojo).
export type EnlacePanel = { href: string; etiqueta: string; roles: readonly Rol[] };

export function enlacesPara(rol: Rol): EnlacePanel[] {
  void rol;
  return [{ href: "/panel/consultas", etiqueta: "Consultas", roles: ["operador", "admin"] }];
}
