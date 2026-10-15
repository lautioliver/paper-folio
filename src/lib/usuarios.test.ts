import { MongoMemoryServer } from "mongodb-memory-server";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { conectar, desconectar } from "./db";
import { buscarRol, registrarIngreso, rolParaEmail } from "./usuarios";
import { Usuario } from "@/models/Usuario";

const listas = { admin: " Admin@Example.com , otra@example.com", operador: "ope@example.com" };

describe("rolParaEmail", () => {
  it.each([
    ["admin@example.com", "admin"],
    ["  ADMIN@example.com ", "admin"],
    ["ope@example.com", "operador"],
    ["visita@example.com", "usuario"],
  ] as const)("%s → %s", (email, rol) => {
    expect(rolParaEmail(email, listas)).toBe(rol);
  });

  it("si un email está en las dos listas, gana admin", () => {
    expect(rolParaEmail("x@example.com", { admin: "x@example.com", operador: "x@example.com" })).toBe("admin");
  });

  it("con listas vacías todos son usuario", () => {
    expect(rolParaEmail("admin@example.com", { admin: "", operador: "" })).toBe("usuario");
  });
});

let servidor: MongoMemoryServer;

beforeAll(async () => {
  servidor = await MongoMemoryServer.create();
  process.env.MONGODB_URI = servidor.getUri();
  process.env.MONGODB_DB = "paperfolio-test";
  await desconectar();
}, 120_000);

beforeEach(async () => {
  await conectar();
  await Usuario.deleteMany({});
});

afterAll(async () => {
  await desconectar();
  await servidor.stop();
});

describe("registrarIngreso", () => {
  it("un email nuevo crea un usuario con rol usuario y el email en minúsculas", async () => {
    const r = await registrarIngreso({ email: "Visita@Example.com", nombre: "Visita", imagen: "https://example.com/a.png" }, listas);
    expect(r.rol).toBe("usuario");
    expect(r.email).toBe("visita@example.com");
    const doc = await Usuario.findById(r.id).lean();
    expect(doc).toMatchObject({ email: "visita@example.com", nombre: "Visita", rol: "usuario" });
    expect(doc?.creadoEn).toBeInstanceOf(Date);
    expect(doc?.ultimoAcceso).toBeInstanceOf(Date);
  });

  it("un email de ADMIN_EMAILS queda como admin", async () => {
    const r = await registrarIngreso({ email: "admin@example.com" }, listas);
    expect(r.rol).toBe("admin");
  });

  it("el rol se recalcula en cada ingreso: si lo sacan de la lista vuelve a usuario", async () => {
    const primero = await registrarIngreso({ email: "admin@example.com" }, listas);
    const segundo = await registrarIngreso({ email: "admin@example.com" }, { admin: "", operador: "" });
    expect(segundo.id).toBe(primero.id);
    expect(segundo.rol).toBe("usuario");
    expect(await Usuario.countDocuments()).toBe(1);
  });

  it("actualiza nombre, imagen y ultimoAcceso sin cambiar creadoEn", async () => {
    const r = await registrarIngreso({ email: "v@example.com", nombre: "Viejo" }, listas);
    const antes = await Usuario.findById(r.id).lean();
    await new Promise((ok) => setTimeout(ok, 10));
    await registrarIngreso({ email: "v@example.com", nombre: "Nuevo", imagen: "https://example.com/b.png" }, listas);
    const despues = await Usuario.findById(r.id).lean();
    expect(despues?.nombre).toBe("Nuevo");
    expect(despues?.imagen).toBe("https://example.com/b.png");
    expect(despues?.creadoEn?.getTime()).toBe(antes?.creadoEn?.getTime());
    expect(despues!.ultimoAcceso.getTime()).toBeGreaterThan(antes!.ultimoAcceso.getTime());
  });

  it("rechaza un email inválido sin guardar nada", async () => {
    await expect(registrarIngreso({ email: "no-es-email" }, listas)).rejects.toThrow();
    expect(await Usuario.countDocuments()).toBe(0);
  });

  it("el índice de email es único", async () => {
    await registrarIngreso({ email: "u@example.com" }, listas);
    await expect(Usuario.create({ email: "u@example.com", ultimoAcceso: new Date() })).rejects.toThrow(/duplicate key/);
  });
});

describe("buscarRol", () => {
  it("devuelve el rol guardado en la base", async () => {
    const r = await registrarIngreso({ email: "ope@example.com" }, listas);
    expect(await buscarRol(r.id, listas)).toBe("operador");
  });

  it("recalcula el rol con las listas vigentes: si lo sacan de ADMIN_EMAILS deja de ser admin sin volver a ingresar", async () => {
    const r = await registrarIngreso({ email: "admin@example.com" }, listas);
    expect(await buscarRol(r.id, listas)).toBe("admin");
    expect(await buscarRol(r.id, { admin: "", operador: "" })).toBe("usuario");
    expect(await buscarRol(r.id, { admin: "", operador: "admin@example.com" })).toBe("operador");
  });

  it("devuelve null si el usuario no existe o el id no es válido", async () => {
    expect(await buscarRol("64b7f0f0f0f0f0f0f0f0f0f0")).toBeNull();
    expect(await buscarRol("no-es-un-id")).toBeNull();
  });
});
