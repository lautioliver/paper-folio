import { describe, expect, it } from "vitest";
import type { Rol } from "@/models/Usuario";
import { evaluarAcceso, rutaInterna, urlDeIngreso } from "./acceso";

const base: Record<string, Rol> = { u1: "usuario", o1: "operador", a1: "admin" };
const buscarRol = async (id: string) => base[id] ?? null;
const sesion = (id: string, rol: Rol) => ({ user: { id, rol } });
const PANEL = ["operador", "admin"] as const;

describe("evaluarAcceso", () => {
  it("sin sesión → sin-sesion", async () => {
    expect(await evaluarAcceso(null, PANEL, buscarRol)).toEqual({ ok: false, motivo: "sin-sesion" });
    expect(await evaluarAcceso({ user: null }, PANEL, buscarRol)).toEqual({ ok: false, motivo: "sin-sesion" });
  });

  it("operador y admin pasan al panel", async () => {
    expect(await evaluarAcceso(sesion("o1", "operador"), PANEL, buscarRol)).toEqual({ ok: true, id: "o1", rol: "operador" });
    expect(await evaluarAcceso(sesion("a1", "admin"), PANEL, buscarRol)).toEqual({ ok: true, id: "a1", rol: "admin" });
  });

  it("un usuario no pasa al panel", async () => {
    expect(await evaluarAcceso(sesion("u1", "usuario"), PANEL, buscarRol)).toEqual({ ok: false, motivo: "sin-permiso" });
  });

  it("manda el rol de la base, no el del token", async () => {
    // El token dice admin, pero en la base es usuario (le sacaron el rol): no pasa.
    expect(await evaluarAcceso(sesion("u1", "admin"), PANEL, buscarRol)).toEqual({ ok: false, motivo: "sin-permiso" });
  });

  it("si el usuario ya no existe en la base → sesion-huerfana", async () => {
    expect(await evaluarAcceso(sesion("borrado", "admin"), PANEL, buscarRol)).toEqual({ ok: false, motivo: "sesion-huerfana" });
  });

  it("sin roles pedidos alcanza con tener sesión de un usuario existente", async () => {
    expect(await evaluarAcceso(sesion("u1", "usuario"), [], buscarRol)).toEqual({ ok: true, id: "u1", rol: "usuario" });
  });
});

describe("evaluarAcceso con usuario borrado", () => {
  it("sesión válida pero el usuario ya no existe → sesion-huerfana (no sin-sesion, para no rebotar con /ingresar)", async () => {
    expect(await evaluarAcceso({ user: { id: "borrado", rol: "admin" } }, ["admin"], async () => null)).toEqual({
      ok: false,
      motivo: "sesion-huerfana",
    });
  });
});

describe("rutaInterna", () => {
  it.each([
    ["/proyectos/ucanode", "/proyectos/ucanode"],
    ["/panel?x=1", "/panel?x=1"],
    ["//evil.com", "/"],
    ["/\\evil.com", "/"],
    ["https://evil.com", "/"],
    ["javascript:alert(1)", "/"],
    ["", "/"],
    ["/\t/evil.com", "/"],
    ["/\n/evil.com", "/"],
    ["/ok con espacio", "/"],
  ])("%j → %s", (entrada, salida) => {
    expect(rutaInterna(entrada)).toBe(salida);
  });
});

describe("urlDeIngreso", () => {
  it("arma /ingresar con callbackUrl codificado", () => {
    expect(urlDeIngreso("/proyectos/ucanode", "sin-sesion")).toBe("/ingresar?callbackUrl=%2Fproyectos%2Fucanode");
  });

  it("una ruta externa vuelve al inicio", () => {
    expect(urlDeIngreso("//evil.com", "sin-sesion")).toBe("/ingresar?callbackUrl=%2F");
  });

  it("con sesión huérfana suma error=sesion", () => {
    expect(urlDeIngreso("/panel", "sesion-huerfana")).toBe("/ingresar?callbackUrl=%2Fpanel&error=sesion");
    expect(urlDeIngreso("/panel", "sin-sesion")).toBe("/ingresar?callbackUrl=%2Fpanel");
  });
});
