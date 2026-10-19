import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { ReactElement } from "react";
import { profile } from "@/content/profile";

export type ColoresMarca = { tinta: string; papel: string };
// css: solo para tests (si no viene, se lee globals.css). opaco: fondo papel detrás del círculo.
export type OpcionesIcono = { css?: string; opaco?: boolean };

// El ícono toma los colores de los tokens de globals.css al generarse: no hay HEX en este código.
// Solo HEX: Satori (el motor de ImageResponse) no entiende otros formatos de color.
export function leerColoresMarca(css: string): ColoresMarca {
  const tinta = css.match(/--color-tinta:\s*(#[0-9a-fA-F]{3,8})\s*;/)?.[1];
  const papel = css.match(/--color-papel:\s*(#[0-9a-fA-F]{3,8})\s*;/)?.[1];
  if (!tinta || !papel) {
    throw new Error("globals.css debe definir --color-tinta y --color-papel en HEX (Satori no entiende otros formatos)");
  }
  return { tinta, papel };
}

/**
 * Logo de Paperfolio para los íconos de la app: la inicial de `profile` en papel dentro de un círculo tinta,
 * como en la barra de navegación (src/components/sitio/Navbar.tsx).
 * Las rutas van literales dentro de join(process.cwd(), …): con una variable, Next traza todo el proyecto.
 */
export async function prepararIcono(
  tamano: number,
  { css, opaco = false }: OpcionesIcono = {},
): Promise<{ elemento: ReactElement; fuente: Buffer }> {
  const [cssMarca, fuente] = await Promise.all([
    css ?? readFile(join(process.cwd(), "src/styles/globals.css"), "utf8"),
    readFile(join(process.cwd(), "assets/fonts/Onest-Bold.ttf")),
  ]);
  const { tinta, papel } = leerColoresMarca(cssMarca);
  const circulo = (
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
      {profile.firstName[0]}
    </div>
  );
  // iOS pinta de negro lo transparente del ícono de inicio: ese va sobre un cuadro papel.
  const elemento = opaco ? (
    <div style={{ width: "100%", height: "100%", display: "flex", background: papel }}>{circulo}</div>
  ) : (
    circulo
  );
  return { elemento, fuente };
}

/** La imagen de un ícono de `tamano` px, lista para `icon.tsx` o `apple-icon.tsx`. */
export async function generarIcono(tamano: number, opciones?: OpcionesIcono) {
  const { elemento, fuente } = await prepararIcono(tamano, opciones);
  return new ImageResponse(elemento, {
    width: tamano,
    height: tamano,
    fonts: [{ name: "Onest", data: fuente, style: "normal", weight: 700 }],
  });
}
