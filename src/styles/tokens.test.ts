import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const SRC = fileURLToPath(new URL("..", import.meta.url));
const css = readFileSync(join(SRC, "styles", "globals.css"), "utf8");
const layout = readFileSync(join(SRC, "app", "layout.tsx"), "utf8");

// Solo el bloque @theme, sin comentarios: un token comentado o fuera del tema no cuenta.
const theme = (css.replace(/\/\*[\s\S]*?\*\//g, "").match(/@theme[^{]*\{([\s\S]*?)\}/g) ?? []).join("\n");

function listar(dir: string): string[] {
  return readdirSync(dir).flatMap((nombre) => {
    const ruta = join(dir, nombre);
    return statSync(ruta).isDirectory() ? listar(ruta) : [ruta];
  });
}

function valorDe(nombre: string): string | undefined {
  const escapado = nombre.replace(/-/g, "\\-");
  const match = theme.match(new RegExp(`${escapado}:\\s*([^;]+);`));
  return match?.[1].trim();
}

describe("tokens de diseño provisorios", () => {
  it.each([
    "--color-primario",
    "--color-acento",
    "--color-secundario",
    "--color-terciario",
    "--color-tinta",
    "--color-papel",
    "--color-superficie",
  ])("define el color semántico %s con un HEX", (nombre) => {
    expect(valorDe(nombre)).toMatch(/^#[0-9a-fA-F]{6}$/);
  });

  it.each(["--text-h1", "--text-h2", "--text-h3", "--text-cuerpo", "--text-pequeno"])(
    "define la escala tipográfica %s con un tamaño",
    (nombre) => {
      expect(valorDe(nombre)).toMatch(/^\d+(\.\d+)?(rem|px)$/);
    },
  );

  it("usa la variable de fuente que carga layout.tsx", () => {
    const usada = valorDe("--font-sans")?.match(/^var\((--font-[a-z-]+)\)$/)?.[1];
    expect(usada).toBeDefined();
    expect(layout).toContain(`variable: "${usada}"`);
  });

  it.each(["--borde-marca", "--radius-marca", "--shadow-marca"])(
    "define el estilo neo-brutalista %s con un valor",
    (nombre) => {
      expect(valorDe(nombre)).toMatch(/\S/);
    },
  );

  it("no hay colores HEX fuera de globals.css", () => {
    const archivos = listar(SRC).filter(
      (ruta) => /\.(tsx?|css)$/.test(ruta) && !ruta.endsWith("globals.css"),
    );
    const conHex = archivos.filter((ruta) =>
      /#[0-9a-fA-F]{3,8}\b/.test(readFileSync(ruta, "utf8")),
    );
    expect(conHex).toEqual([]);
  });
});
