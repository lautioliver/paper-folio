import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { leerColoresMarca, prepararIcono } from "./icono-marca";

// Los tokens de la marca viven en globals.css; el ícono los lee de ahí al generarse.
const CSS_REAL = join(process.cwd(), "src/styles/globals.css");
const HEX = /^#[0-9a-f]{3,8}$/i;

type Estilo = { background?: string; color?: string };
const estiloDe = (elemento: unknown) => (elemento as { props: { style: Estilo } }).props.style;

describe("leerColoresMarca", () => {
  it("toma tinta y papel de los tokens de globals.css", async () => {
    const css = await readFile(CSS_REAL, "utf8");
    const colores = leerColoresMarca(css);
    expect(colores.tinta).toMatch(HEX);
    expect(colores.papel).toMatch(HEX);
    expect(css).toContain(`--color-tinta: ${colores.tinta};`);
    expect(css).toContain(`--color-papel: ${colores.papel};`);
  });

  it("falla si globals.css no define los tokens de la marca", () => {
    expect(() => leerColoresMarca("body { color: red; }")).toThrow(/--color-tinta/);
  });
});

describe("prepararIcono", () => {
  it("usa los colores que declara globals.css, no valores fijos en el código", async () => {
    const dir = await mkdtemp(join(tmpdir(), "icono-marca-"));
    const css = join(dir, "globals.css");
    await writeFile(css, "@theme {\n  --color-tinta: #123456;\n  --color-papel: #fedcba;\n}\n");
    const { elemento } = await prepararIcono(32, await readFile(css, "utf8"));
    expect(estiloDe(elemento).background).toBe("#123456");
    expect(estiloDe(elemento).color).toBe("#fedcba");
  });

  it("el ícono real sale con los colores de la marca de globals.css", async () => {
    const { tinta, papel } = leerColoresMarca(await readFile(CSS_REAL, "utf8"));
    const { elemento } = await prepararIcono(180);
    expect(estiloDe(elemento).background).toBe(tinta);
    expect(estiloDe(elemento).color).toBe(papel);
  });
});
