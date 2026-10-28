import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const SITIO = fileURLToPath(new URL("../components/sitio", import.meta.url));
const ESTILOS = fileURLToPath(new URL("../styles/globals.css", import.meta.url));
const read = (name: string) => (existsSync(join(SITIO, name)) ? readFileSync(join(SITIO, name), "utf8") : "");
const code = (name: string) => read(name).replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|\s)\/\/.*$/gm, "$1");

describe("interactividad del sitio: reduced-motion", () => {
  for (const archivo of ["ContadorNumero.tsx", "ExitoEnvio.tsx", "FiltroProyectos.tsx", "ResaltarHitos.tsx"]) {
    it(`${archivo} existe y anima solo dentro de matchMedia(MOTION_OK)`, () => {
      const src = code(archivo);
      expect(src).toContain("mm.add(MOTION_OK");
    });
  }

  it("ResaltarHitos revierte lo que crea al desmontar", () => {
    expect(code("ResaltarHitos.tsx")).toContain("mm.revert()");
  });

  it("las tarjetas reaccionan al mouse y al foco, y sin movimiento con reduced-motion", () => {
    const css = readFileSync(ESTILOS, "utf8");
    expect(css).toMatch(/@utility elevable[\s\S]*?:hover[\s\S]*?:focus-within/);
    const reducido = css.slice(css.indexOf("@media (prefers-reduced-motion: reduce)"));
    expect(reducido).toContain(".elevable");
  });

  it("las tarjetas de proyectos y servicios usan elevable", () => {
    const src = read("Sections.tsx");
    expect((src.match(/elevable/g) ?? []).length).toBeGreaterThanOrEqual(2);
  });

  it("el formulario de contacto muestra ExitoEnvio al enviar", () => {
    expect(code("ContactForm.tsx")).toContain("<ExitoEnvio");
  });

  it("la trayectoria y 'proyectos públicos' usan los componentes nuevos", () => {
    const src = read("Sections.tsx");
    expect(src).toContain("<ResaltarHitos");
    expect(src).toContain("<ContadorNumero");
  });
});
