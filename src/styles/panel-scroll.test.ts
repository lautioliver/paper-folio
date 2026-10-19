import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const SRC = fileURLToPath(new URL("..", import.meta.url));
const css = readFileSync(join(SRC, "styles", "globals.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
const shell = readFileSync(join(SRC, "components", "panel", "PanelShell.tsx"), "utf8");

// UX-TRANS-03: la barra inferior fija del panel (menos de 1024 px) no puede tapar el control con foco.
describe("scroll-padding del panel", () => {
  it("PanelShell marca el contenedor con data-panel", () => {
    expect(shell).toMatch(/<div[^>]*\bdata-panel\b/);
  });

  it("globals.css reserva scroll-padding-bottom en el html que contiene el panel", () => {
    expect(css).toMatch(/html:has\(\[data-panel\]\)\s*\{[^}]*scroll-padding-bottom:\s*80px/);
  });

  it("la regla vale solo bajo el corte lg (1024 px), donde está la barra inferior", () => {
    expect(css).toMatch(/@media\s*\(width\s*<\s*64rem\)\s*\{\s*html:has\(\[data-panel\]\)/);
  });
});
