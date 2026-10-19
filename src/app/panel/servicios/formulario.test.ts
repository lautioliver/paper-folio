import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// Sin DOM (jsdom no está instalado): se mira el código del selector de ícono.
const fuente = readFileSync(fileURLToPath(new URL("./formulario.tsx", import.meta.url)), "utf8");
const selector = fuente.slice(fuente.indexOf('aria-label="Ícono"'), fuente.indexOf('id="error-icono"'));

describe("selector de ícono de los servicios", () => {
  it("el radio se oculta (sr-only), así que el label tiene que mostrar el foco", () => {
    expect(selector).toContain('className="sr-only"');
    for (const clase of [
      "has-focus-visible:outline-2",
      "has-focus-visible:outline-offset-2",
      "has-focus-visible:outline-secundario",
    ]) {
      expect(selector).toContain(clase);
    }
  });
});
