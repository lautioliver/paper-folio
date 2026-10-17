import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { projects } from "@/content/profile";
import { rutaDemo, rutaDetalle } from "./proyectos";

describe("rutaDetalle", () => {
  it("arma /proyectos/<slug>", () => {
    expect(rutaDetalle("ucanode")).toBe("/proyectos/ucanode");
  });

  it("codifica el slug para que no cambie la ruta (? # espacios)", () => {
    expect(rutaDetalle("a?b#c d")).toBe("/proyectos/a%3Fb%23c%20d");
  });
});

describe("rutaDemo", () => {
  it("lleva al detalle, posicionado en la demo", () => {
    expect(rutaDemo("ucanode")).toBe("/proyectos/ucanode#demo");
  });
});

describe("caso de estudio", () => {
  it("cada proyecto trae problema, solución, funcionalidades y stack, con datos públicos", () => {
    for (const project of projects) {
      const { caso } = project;
      expect(caso.problema.length, project.slug).toBeGreaterThan(20);
      expect(caso.solucion.length, project.slug).toBeGreaterThan(20);
      expect(caso.funcionalidades.length, project.slug).toBeGreaterThanOrEqual(3);
      expect(caso.stack.length, project.slug).toBeGreaterThanOrEqual(3);
      expect(project.repoUrl, project.slug).toMatch(/^https:\/\/github\.com\/lautioliver\//);
      expect(project.demoUrl, project.slug).toMatch(/^https:\/\//);
    }
  });
});

describe("detalle protegido en el servidor", () => {
  it("la página de detalle llama a requerirSesion con su propia ruta (sin depender de proxy.ts)", () => {
    const fuente = readFileSync("src/app/(sitio)/proyectos/[slug]/page.tsx", "utf8");
    expect(fuente).toMatch(/requerirSesion\(\s*rutaDetalle\(/);
  });

  it("cuenta la vista como acceso de tipo detalle (#54) solo después de la sesión y si el proyecto existe", () => {
    const fuente = readFileSync("src/app/(sitio)/proyectos/[slug]/page.tsx", "utf8");
    // Con el id que devuelve `requerirSesion` (sin sesión redirige antes), después del 404, y con `after`: no
    // demora la página y nunca corre en el prerender (`requerirSesion` marca la ruta como dinámica).
    expect(fuente).toMatch(
      /const \{ id \} = await requerirSesion\(\s*rutaDetalle\(slug\)\s*\);[\s\S]*if \(!detalle\) notFound\(\);[\s\S]*after\(\(\) => registrarAcceso\(id, "detalle"\)\)/,
    );
    expect(fuente.match(/registrarAcceso\(/g)).toHaveLength(1);
  });
});

describe("el sitio lee el contenido de la base (src/lib/contenido.ts)", () => {
  const fuentes = {
    secciones: readFileSync("src/components/sitio/Sections.tsx", "utf8"),
    listado: readFileSync("src/app/(sitio)/proyectos/page.tsx", "utf8"),
    detalle: readFileSync("src/app/(sitio)/proyectos/[slug]/page.tsx", "utf8"),
  };

  it("la landing, /proyectos y el detalle no leen los proyectos ni los servicios de profile.ts", () => {
    for (const [nombre, fuente] of Object.entries(fuentes)) {
      expect(fuente, nombre).not.toMatch(/import\s*\{[^}]*\b(projects|services)\b[^}]*\}\s*from\s*"@\/content\/profile"/);
      expect(fuente, nombre).toMatch(/from "@\/lib\/contenido"/);
    }
  });

  it("el detalle da 404 si el proyecto no está publicado y muestra las demos activas", () => {
    // Proyecto y demos en una sola lectura: no se mezclan la base y el respaldo.
    expect(fuentes.detalle).toMatch(/await detalleProyecto\(slug\)[\s\S]*if \(!detalle\) notFound\(\)/);
  });

  it("una demo http no va en el iframe (contenido mixto en el sitio https): solo el enlace", () => {
    expect(fuentes.detalle).toMatch(/esUrlHttps\(demo\.url\)\s*&&\s*\(\s*<iframe/);
  });
});
