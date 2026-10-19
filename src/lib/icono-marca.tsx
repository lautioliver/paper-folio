import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { ReactElement } from "react";

export type ColoresMarca = { tinta: string; papel: string };

// El ícono toma los colores de los tokens de globals.css al generarse: no hay HEX en este código.
export function leerColoresMarca(css: string): ColoresMarca {
  const tinta = css.match(/--color-tinta:\s*(#[0-9a-fA-F]{3,8})\s*;/)?.[1];
  const papel = css.match(/--color-papel:\s*(#[0-9a-fA-F]{3,8})\s*;/)?.[1];
  if (!tinta || !papel) {
    throw new Error("globals.css debe definir --color-tinta y --color-papel");
  }
  return { tinta, papel };
}

/**
 * Logo de Paperfolio para los íconos de la app: la "L" en papel dentro de un círculo tinta,
 * como en la barra de navegación (src/components/sitio/Navbar.tsx). Lo usan icon.tsx y apple-icon.tsx,
 * que pasan el elemento y la fuente a ImageResponse.
 */
// Las rutas van literales dentro de join(process.cwd(), …): con una variable, Next traza todo el proyecto.
export async function prepararIcono(
  tamano: number,
  css?: string,
): Promise<{ elemento: ReactElement; fuente: Buffer }> {
  const [cssMarca, fuente] = await Promise.all([
    css ?? readFile(join(process.cwd(), "src/styles/globals.css"), "utf8"),
    readFile(join(process.cwd(), "assets/fonts/Onest-Bold.ttf")),
  ]);
  const { tinta, papel } = leerColoresMarca(cssMarca);
  const elemento = (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: tinta,
        color: papel,
        borderRadius: "50%",
        fontFamily: "Onest",
        fontWeight: 700,
        fontSize: Math.round(tamano * 0.55),
        lineHeight: 1,
      }}
    >
      L
    </div>
  );
  return { elemento, fuente };
}
