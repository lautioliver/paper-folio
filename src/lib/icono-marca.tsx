import type { ReactElement } from "react";

export type ColoresMarca = { tinta: string; papel: string };
export type OpcionesIcono = { css?: string; opaco?: boolean };

// Stub de TDD: todavía no implementa nada.
export function leerColoresMarca(_css: string): ColoresMarca {
  return { tinta: "", papel: "" };
}

export async function prepararIcono(
  _tamano: number,
  _opciones?: OpcionesIcono,
): Promise<{ elemento: ReactElement; fuente: Buffer }> {
  return { elemento: <div style={{}} />, fuente: Buffer.alloc(0) };
}
