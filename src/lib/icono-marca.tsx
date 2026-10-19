import type { ReactElement } from "react";

export type ColoresMarca = { tinta: string; papel: string };

// Stub de TDD: todavía no implementa nada.
export function leerColoresMarca(_css: string): ColoresMarca {
  return { tinta: "", papel: "" };
}

export async function prepararIcono(
  _tamano: number,
  _rutaCss?: string,
): Promise<{ elemento: ReactElement; fuente: Buffer }> {
  return { elemento: <div style={{}} />, fuente: Buffer.alloc(0) };
}
