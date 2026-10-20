import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { profile } from "@/content/profile";
import { leerColoresMarca, prepararIcono } from "./icono-marca";

// Los tokens de la marca viven en globals.css; el ícono los lee de ahí al generarse.
const CSS_REAL = join(process.cwd(), "src/styles/globals.css");
const HEX = /^#[0-9a-f]{3,8}$/i;

type Estilo = { background?: string; color?: string };
type Nodo = { props: { style: Estilo; children?: unknown } };
const estiloDe = (elemento: unknown) => (elemento as Nodo).props.style;
// Con fondo opaco (apple-icon), el círculo es el hijo del cuadro de papel.
const circuloDe = (elemento: unknown) => {
  const hijo = (elemento as Nodo).props.children;
  return typeof hijo === "object" && hijo !== null ? (hijo as Nodo) : (elemento as Nodo);
};

describe("leerColoresMarca", () => {
  it("toma tinta y papel de los tokens de globals.css", async () => {
    const css = await readFile(CSS_REAL, "utf8");
    const colores = leerColoresMarca(css);
    expect(colores.tinta).toMatch(HEX);
    expect(colores.papel).toMatch(HEX);
    expect(css).toContain(`--color-tinta: ${colores.tinta};`);
    expect(css).toContain(`--color-papel: ${colores.papel};`);
  });

  it("rechaza un token que no es HEX de 3, 4, 6 u 8 dígitos", async () => {
    const css = await readFile(CSS_REAL, "utf8");
    for (const malo of ["#12345", "#1234567"]) {
      const roto = css.replace(/--color-tinta:\s*[^;]+;/, `--color-tinta: ${malo};`);
      expect(() => leerColoresMarca(roto)).toThrow(/--color-tinta/);
    }
  });

  it("falla si globals.css no define los tokens de la marca", () => {
    expect(() => leerColoresMarca("body { color: red; }")).toThrow(/--color-tinta/);
  });
});

describe("prepararIcono", () => {
  it("usa los colores que declara globals.css, no valores fijos en el código", async () => {
    const css = await readFile(CSS_REAL, "utf8");
    const { tinta, papel } = leerColoresMarca(css);
    // Se intercambian los dos tokens reales: si el ícono tuviera colores fijos, no cambiaría.
    const intercambiado = css
      .replace(`--color-tinta: ${tinta};`, `--color-tinta: ${papel};`)
      .replace(`--color-papel: ${papel};`, `--color-papel: ${tinta};`);
    expect(intercambiado).not.toBe(css);
    const { elemento } = await prepararIcono(32, { css: intercambiado });
    expect(estiloDe(elemento).background).toBe(papel);
    expect(estiloDe(elemento).color).toBe(tinta);
  });

  it("el ícono real sale con los colores de la marca de globals.css", async () => {
    const { tinta, papel } = leerColoresMarca(await readFile(CSS_REAL, "utf8"));
    const { elemento } = await prepararIcono(180);
    expect(estiloDe(elemento).background).toBe(tinta);
    expect(estiloDe(elemento).color).toBe(papel);
  });

  it("la letra es la inicial de profile.firstName", async () => {
    const { elemento } = await prepararIcono(32);
    expect(circuloDe(elemento).props.children).toBe(profile.firstName[0]);
  });

  it("el ícono de iOS va opaco: fondo papel detrás del círculo", async () => {
    const { tinta, papel } = leerColoresMarca(await readFile(CSS_REAL, "utf8"));
    const { elemento } = await prepararIcono(180, { opaco: true });
    expect(estiloDe(elemento).background).toBe(papel);
    expect(estiloDe(circuloDe(elemento)).background).toBe(tinta);
  });
});
