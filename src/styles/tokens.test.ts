import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const SRC = fileURLToPath(new URL("..", import.meta.url));
const SELF = "tokens.test.ts";
const css = readFileSync(join(SRC, "styles", "globals.css"), "utf8");
const layoutSource = readFileSync(join(SRC, "app", "layout.tsx"), "utf8");

// Comentarios de bloque y de línea fuera; anclas href="#…" fuera.
function stripNoise(code: string): string {
  return code
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|\s)\/\/.*$/gm, "$1")
    .replace(/href=["'{]?#[^"'}\s]*/g, "");
}

// Solo colores HEX de 3, 4, 6 u 8 dígitos.
const HEX = /#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b/g;

function findHex(code: string): string[] {
  return stripNoise(code).match(HEX) ?? [];
}

// Solo el bloque @theme, sin comentarios: un token comentado o fuera del tema no cuenta.
const themeBlock = (stripNoise(css).match(/@theme[^{]*\{([\s\S]*?)\}/g) ?? []).join("\n");

function listFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const file = join(dir, name);
    return statSync(file).isDirectory() ? listFiles(file) : [file];
  });
}

function themeValue(name: string): string | undefined {
  const escaped = name.replace(/-/g, "\\-");
  const match = themeBlock.match(new RegExp(`${escaped}:\\s*([^;]+);`));
  return match?.[1].trim();
}

describe("detector de HEX", () => {
  it.each([
    ["un número de issue en un comentario", "// ver issue #123", []],
    ["un ancla de href", '<a href="#faded">', []],
    ["un HEX de 6 dígitos", 'style={{ color: "#ff0000" }}', ["#ff0000"]],
    ["un HEX de 3 dígitos", 'color: "#abc"', ["#abc"]],
  ])("ignora o detecta según el caso: %s", (_caso, code, esperado) => {
    expect(findHex(code)).toEqual(esperado);
  });
});

describe("tokens de diseño provisorios", () => {
  it.each([
    "--color-primario",
    "--color-acento",
    "--color-secundario",
    "--color-terciario",
    "--color-tinta",
    "--color-papel",
    "--color-superficie",
  ])("define el color semántico %s con un HEX", (name) => {
    expect(themeValue(name)).toMatch(/^#[0-9a-fA-F]{6}$/);
  });

  it.each(["--text-h1", "--text-h2", "--text-h3", "--text-cuerpo", "--text-pequeno"])(
    "define la escala tipográfica %s con un tamaño",
    (name) => {
      expect(themeValue(name)).toMatch(/^\d+(\.\d+)?(rem|px)$/);
    },
  );

  it("usa la variable de fuente que carga layout.tsx", () => {
    const usedVar = themeValue("--font-sans")?.match(/^var\((--font-[a-z-]+)\)$/)?.[1];
    expect(usedVar).toBeDefined();
    expect(layoutSource).toContain(`variable: "${usedVar}"`);
  });

  it("fija el borde en 2px (lo define el issue)", () => {
    expect(themeValue("--borde-marca")).toBe("2px");
  });

  it("define el radio como una longitud", () => {
    expect(themeValue("--radius-marca")).toMatch(/^\d+(\.\d+)?(rem|px)$/);
  });

  it("define una sombra dura sin blur, en la tinta del tema", () => {
    expect(themeValue("--shadow-marca")).toMatch(
      /^-?\d+px -?\d+px 0 var\(--color-tinta\)$/,
    );
  });

  it("no hay colores HEX fuera de globals.css", () => {
    const files = listFiles(SRC).filter(
      (file) =>
        /\.(tsx?|css)$/.test(file) &&
        !file.endsWith("globals.css") &&
        !file.endsWith(SELF),
    );
    const withHex = files.filter((file) => findHex(readFileSync(file, "utf8")).length > 0);
    expect(withHex).toEqual([]);
  });
});
