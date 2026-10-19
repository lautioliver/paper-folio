import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// Sin DOM (jsdom no está instalado): se mira el código del selector de ícono.
const fuente = readFileSync(fileURLToPath(new URL("./formulario.tsx", import.meta.url)), "utf8");
const inicio = fuente.indexOf('aria-label="Ícono"');
const fin = fuente.indexOf('id="error-icono"');
const selector = fuente.slice(inicio, fin);

// className del <label> que envuelve al radio de cada opción.
const label = selector.match(/<label\b[^>]*?className="([^"]*)"[^>]*>\s*<input\b[^>]*?type="radio"/)?.[1] ?? "";

describe("selector de ícono de los servicios", () => {
  it("encuentra el tramo del selector en el fuente", () => {
    expect(inicio).toBeGreaterThan(-1);
    expect(fin).toBeGreaterThan(inicio);
    expect(label).not.toBe("");
  });

  it("el radio se oculta (sr-only), así que el label tiene que mostrar el foco", () => {
    expect(selector).toMatch(/<input\b[^>]*className="sr-only"/);
    const clases = label.split(/\s+/);
    expect(clases).toContain("foco-contenedor");
  });
});
