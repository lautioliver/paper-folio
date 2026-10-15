import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const SRC = join(process.cwd(), "src");
const css = readFileSync(join(SRC, "styles", "globals.css"), "utf8");

function listar(dir: string): string[] {
  return readdirSync(dir).flatMap((nombre) => {
    const ruta = join(dir, nombre);
    return statSync(ruta).isDirectory() ? listar(ruta) : [ruta];
  });
}

function valorDe(nombre: string): string | undefined {
  const escapado = nombre.replace(/[-]/g, "\\-");
  const match = css.match(new RegExp(`${escapado}:\\s*([^;]+);`));
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
    expect(valorDe(nombre)).toMatch(/^#[0-9A-Fa-f]{6}$/);
  });

  it.each(["--text-h1", "--text-h2", "--text-h3", "--text-cuerpo", "--text-pequeno"])(
    "define la escala tipográfica %s",
    (nombre) => {
      expect(valorDe(nombre)).toBeDefined();
    },
  );

  it("usa la fuente de next/font para el sans", () => {
    expect(valorDe("--font-sans")).toMatch(/var\(--font-[a-z-]+\)/);
  });

  it.each(["--borde-marca", "--radius-marca", "--shadow-marca"])(
    "define el estilo neo-brutalista %s",
    (nombre) => {
      expect(valorDe(nombre)).toBeDefined();
    },
  );

  it("no hay colores HEX fuera de globals.css", () => {
    const tsx = listar(SRC).filter((ruta) => ruta.endsWith(".tsx"));
    const conHex = tsx.filter((ruta) => /#[0-9a-fA-F]{6}\b/.test(readFileSync(ruta, "utf8")));
    expect(conHex).toEqual([]);
  });
});
