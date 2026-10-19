import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const SRC = fileURLToPath(new URL("..", import.meta.url));
const leer = (...ruta: string[]) => readFileSync(join(SRC, ...ruta), "utf8");
const css = leer("styles", "globals.css").replace(/\/\*[\s\S]*?\*\//g, "");

// UX-TRANS-05: la opción elegida no puede distinguirse solo por el color (WCAG 1.4.1).
describe("opción elegida (UX-TRANS-05)", () => {
  it("hay una utilidad `elegido` que suma la sombra de marca", () => {
    expect(css).toMatch(/@utility elegido\s*\{[^}]*box-shadow:\s*var\(--shadow-marca\)/);
  });

  it("la navegación del panel la aplica solo a la sección actual", () => {
    expect(leer("components", "panel", "EnlacesPanel.tsx")).toMatch(/actual \? "[^"]*\belegido\b/);
  });

  it("los filtros de métricas la aplican solo a la opción actual", () => {
    expect(leer("app", "panel", "metricas", "page.tsx")).toMatch(/o\.actual \? "[^"]*\belegido\b/);
  });

  it("el selector de ícono la aplica cuando el radio está marcado", () => {
    expect(leer("app", "panel", "servicios", "formulario.tsx")).toMatch(/has-checked:elegido/);
  });
});
