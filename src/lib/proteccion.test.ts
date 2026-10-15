import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { PREFIJOS_PROTEGIDOS, redireccionDeProxy } from "./proteccion";

describe("redireccionDeProxy", () => {
  it("sin sesión, el detalle de un proyecto redirige a /ingresar con callbackUrl", () => {
    expect(redireccionDeProxy("/proyectos/ucanode", false)).toBe("/ingresar?callbackUrl=%2Fproyectos%2Fucanode");
  });

  it("con sesión deja pasar", () => {
    expect(redireccionDeProxy("/proyectos/ucanode", true)).toBeNull();
  });

  it("el listado /proyectos y el resto del sitio son públicos", () => {
    for (const ruta of ["/", "/proyectos", "/proyectos/", "/ingresar", "/api/auth/session"]) {
      expect(redireccionDeProxy(ruta, false), ruta).toBeNull();
    }
  });

  it("protege cualquier ruta bajo /proyectos/, también con barra final o subrutas", () => {
    expect(redireccionDeProxy("/proyectos/ucanode/", false)).not.toBeNull();
    expect(redireccionDeProxy("/proyectos/a/b", false)).not.toBeNull();
  });

  it("no se deja engañar por prefijos parecidos", () => {
    expect(redireccionDeProxy("/proyectosx/ucanode", false)).toBeNull();
  });
});

describe("matcher de proxy.ts", () => {
  it("cubre cada prefijo de PREFIJOS_PROTEGIDOS (si no, el proxy no corre y la redirección rápida se pierde)", () => {
    const fuente = readFileSync("src/proxy.ts", "utf8");
    for (const prefijo of PREFIJOS_PROTEGIDOS) {
      expect(fuente, prefijo).toContain(`"${prefijo}:path+"`);
    }
  });
});
