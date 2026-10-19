import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import NotFound, { metadata } from "./not-found";
import ErrorPage from "./error";
import GlobalError from "./global-error";

const props = { error: new Error("boom"), retry: vi.fn(), reset: vi.fn() } as never;

describe("not-found", () => {
  const html = renderToStaticMarkup(createElement(NotFound));
  it("tiene título de pestaña en español", () => {
    expect(metadata).toMatchObject({ title: "Página no encontrada" });
  });
  it("muestra un h1 en español con salida al inicio y a los proyectos", () => {
    expect(html).toMatch(/<h1[^>]*>[^<]*no encontrada/i);
    expect(html).toMatch(/<a[^>]*href="\/"[^>]*>[^<]*Volver al inicio/);
    expect(html).toMatch(/<a[^>]*href="\/proyectos"/);
  });
});

describe("error", () => {
  const html = renderToStaticMarkup(createElement(ErrorPage, props));
  it("avisa en español y ofrece reintentar y volver al inicio", () => {
    expect(html).toContain("Algo salió mal");
    expect(html).toMatch(/<button[^>]*>[^<]*Probar de nuevo/);
    expect(html).toMatch(/<a[^>]*href="\/"[^>]*>[^<]*Volver al inicio/);
  });
  it("no abre otro main: el panel ya tiene uno", () => {
    expect(html).not.toContain("<main");
  });
  it("no muestra el mensaje del error", () => {
    expect(html).not.toContain("boom");
  });
});

describe("global-error", () => {
  const html = renderToStaticMarkup(createElement(GlobalError, props));
  it("trae su propio documento en es-AR con texto en español", () => {
    expect(html).toContain('<html lang="es-AR"');
    expect(html).toContain("Algo salió mal");
    expect(html).toMatch(/<button[^>]*>[^<]*Probar de nuevo/);
    expect(html).not.toContain("boom");
  });
});
