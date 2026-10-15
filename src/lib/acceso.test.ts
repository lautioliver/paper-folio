import { describe, expect, it } from "vitest";
import type { Rol } from "@/models/Usuario";
import { evaluarAcceso } from "./acceso";

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

  it("si el usuario ya no existe en la base → sin-sesion", async () => {
    expect(await evaluarAcceso(sesion("borrado", "admin"), PANEL, buscarRol)).toEqual({ ok: false, motivo: "sin-sesion" });
  });

  it("sin roles pedidos alcanza con tener sesión de un usuario existente", async () => {
    expect(await evaluarAcceso(sesion("u1", "usuario"), [], buscarRol)).toEqual({ ok: true, id: "u1", rol: "usuario" });
  });
});
