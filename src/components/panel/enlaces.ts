import type { Rol } from "@/models/Usuario";

export type EnlacePanel = { href: string; etiqueta: string };

export function enlacesPara(rol: Rol): EnlacePanel[] {
  void rol;
  return [];
}

export function esActual(pathname: string, href: string): boolean {
  void pathname;
  void href;
  return false;
}
