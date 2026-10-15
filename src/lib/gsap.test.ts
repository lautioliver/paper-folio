import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { MOTION_OK } from "./gsap";

const SITIO = fileURLToPath(new URL("../components/sitio", import.meta.url));
const read = (name: string) => readFileSync(join(SITIO, name), "utf8");
// Sin comentarios: que un texto en un JSDoc no haga pasar el test.
const code = (name: string) => read(name).replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|\s)\/\/.*$/gm, "$1");

describe("movimiento", () => {
  it("MOTION_OK es la consulta de no-preference", () => {
    expect(MOTION_OK).toBe("(prefers-reduced-motion: no-preference)");
  });

  it("Reveal anima con ScrollTrigger solo dentro de matchMedia(MOTION_OK)", () => {
    const src = code("Reveal.tsx");
    expect(src).toContain("mm.add(MOTION_OK");
    expect(src).toContain("scrollTrigger:");
    expect(src).not.toContain("IntersectionObserver");
  });

  it("HeroMotion anima solo dentro de matchMedia(MOTION_OK)", () => {
    expect(code("HeroMotion.tsx")).toContain("mm.add(MOTION_OK");
  });

  it("el hero no anima opacity: no puede parpadear al hidratar", () => {
    expect(code("HeroMotion.tsx")).not.toMatch(/opacity/);
  });

  it("gsap es dependencia", () => {
    const pkg = JSON.parse(readFileSync("package.json", "utf8"));
    expect(pkg.dependencies.gsap).toBeTruthy();
  });
});
