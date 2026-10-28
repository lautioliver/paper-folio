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

  it("FiltroProyectos refresca los ScrollTrigger al filtrar y no depende de un guard de primer render", () => {
    const src = code("FiltroProyectos.tsx");
    expect(src).toContain("ScrollTrigger.refresh()");
    expect(src).not.toContain("primera");
  });

  it("ContadorNumero deja el 0 puesto al crear la animación, sin esperar al disparo", () => {
    expect(code("ContadorNumero.tsx")).not.toContain("onStart");
  });

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

const sitio = (name: string) => read(name);
const css = () => readFileSync(ESTILOS, "utf8");
const DOCS = fileURLToPath(new URL("../../docs", import.meta.url));

describe("más animaciones del sitio: reduced-motion", () => {
  for (const archivo of ["Marcador.tsx", "ProgresoLectura.tsx"]) {
    it(`${archivo} existe y anima solo dentro de matchMedia(MOTION_OK)`, () => {
      expect(code(archivo)).toContain("mm.add(MOTION_OK");
    });
  }

  it("el hero entra palabra por palabra, flota en loop y tiene parallax con el scroll", () => {
    const src = code("HeroMotion.tsx");
    expect(src).toContain("[data-palabra]");
    expect(src).toContain("repeat: -1");
    expect(src).toContain("scrub");
    expect(src).not.toMatch(/opacity/);
    expect(code("Palabras.tsx")).toContain("data-palabra");
    expect(sitio("Sections.tsx")).toContain("<Palabras");
  });

  it("el marcador de Highlight se pinta de izquierda a derecha con clip-path", () => {
    expect(code("Marcador.tsx")).toContain("clipPath");
    expect(code("Highlight.tsx")).toContain("<Marcador");
  });

  it("Reveal admite retraso y escalonar las piezas de una tarjeta", () => {
    const src = code("Reveal.tsx");
    expect(src).toContain("retraso");
    expect(src).toContain("data-escalon");
    const sections = sitio("Sections.tsx");
    expect(sections).toContain("retraso={");
    expect(sections).toContain("data-escalon");
  });

  it("la ilustración del servicio se mueve al hover de la tarjeta y se apaga con reduced-motion", () => {
    const src = sitio("Sections.tsx");
    expect(src).toContain("group-hover/servicio:");
    expect(src).toContain("motion-reduce:");
  });

  it("la barra de progreso de lectura va en el layout del sitio y no tapa nada", () => {
    expect(readFileSync(join(SITIO, "../../app/(sitio)/layout.tsx"), "utf8")).toContain("<ProgresoLectura");
    const src = code("ProgresoLectura.tsx");
    expect(src).toContain("pointer-events-none");
    expect(src).toContain("aria-hidden");
  });

  it("la Navbar se compacta al scrollear y marca la sección activa", () => {
    const src = code("Navbar.tsx");
    expect(src).toContain("data-compacta");
    expect(src).toContain("aria-current");
    expect(src).toContain("seccionActiva");
    expect(css()).toContain(".navbar-barra");
    expect(css()).toContain(".navbar-indicador");
  });

  it("el hover de los botones y las tarjetas es solo para punteros con hover", () => {
    const estilos = css();
    expect(estilos).toMatch(/@utility apretable[\s\S]*?@media \(hover: hover\)/);
    expect(estilos).toMatch(/@utility elevable[\s\S]*?@media \(hover: hover\)/);
  });

  it("ResaltarHitos usa una sola línea de referencia: nunca dos hitos activos", () => {
    const src = code("ResaltarHitos.tsx");
    expect(src).toContain('start: "top center"');
    expect(src).toContain('end: "bottom center"');
  });

  it("detalles: aviso con alto mínimo y número con tabulares", () => {
    expect(code("ContactForm.tsx")).toContain("min-h-7");
    expect(code("Sections.tsx")).toContain("tabular-nums");
  });

  it("surfaces.md menciona el filtro por categoría de /proyectos", () => {
    const fila = readFileSync(join(DOCS, "reference/surfaces.md"), "utf8")
      .split("\n")
      .find((linea) => linea.startsWith("| `/proyectos` |"));
    expect(fila).toMatch(/categor/i);
  });
});
