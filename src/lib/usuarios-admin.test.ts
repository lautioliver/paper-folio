import { MongoMemoryServer } from "mongodb-memory-server";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { conectar, desconectar } from "./db";
import { cambiarBloqueoUsuario, cambiarRolUsuario, listarUsuarios, patronDeBusqueda, POR_PAGINA } from "./usuarios-admin";
import { buscarRol, usuarioBloqueado } from "./usuarios";
import { Usuario, type Rol } from "@/models/Usuario";

const ADMINS = "jefa@example.com";

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

async function crear(email: string, extra: { nombre?: string; rol?: Rol; bloqueado?: boolean } = {}): Promise<string> {
  const { insertedId } = await Usuario.collection.insertOne({
    email,
    nombre: extra.nombre ?? "",
    imagen: "",
    rol: extra.rol ?? "usuario",
    bloqueado: extra.bloqueado ?? false,
    accesos: 0,
    creadoEn: new Date(),
    ultimoAcceso: new Date(),
  });
  return String(insertedId);
}

describe("patronDeBusqueda", () => {
  it("escapa los caracteres especiales de regex (sin inyección ni ReDoS)", () => {
    for (const q of [".*", "(a+)+$", "[", "a|b", "\\", "^x$", "a{1,99999}"]) {
      const re = patronDeBusqueda(q);
      expect(re.test(q)).toBe(true);
      expect(re.test("otra cosa")).toBe(false);
    }
    expect(patronDeBusqueda("ANA").flags).toContain("i");
  });
});

describe("listarUsuarios", () => {
  it(`pagina de a ${POR_PAGINA}, los más nuevos primero, y una página de más cae en la última`, async () => {
    for (let i = 0; i < 25; i++) await crear(`u${String(i).padStart(2, "0")}@example.com`);
    const p1 = await listarUsuarios({ q: "", pagina: 1 }, ADMINS);
    expect(POR_PAGINA).toBe(20);
    expect(p1).toMatchObject({ total: 25, pagina: 1, paginas: 2 });
    expect(p1.usuarios).toHaveLength(20);
    expect(p1.usuarios[0].email).toBe("u24@example.com");
    const p2 = await listarUsuarios({ q: "", pagina: 2 }, ADMINS);
    expect(p2.usuarios).toHaveLength(5);
    expect(await listarUsuarios({ q: "", pagina: 9 }, ADMINS)).toMatchObject({ pagina: 2, paginas: 2 });
  });

  it("sin usuarios: una página vacía", async () => {
    expect(await listarUsuarios({ q: "", pagina: 1 }, ADMINS)).toEqual({ usuarios: [], total: 0, pagina: 1, paginas: 1 });
  });

  it("busca por nombre o email sin distinguir mayúsculas, y los caracteres especiales valen literal", async () => {
    await crear("ana@example.com", { nombre: "Ana Pérez" });
    await crear("beto@example.com", { nombre: "Beto" });
    await crear("a+b@example.com", { nombre: "Con más" });
    const emails = async (q: string) => (await listarUsuarios({ q, pagina: 1 }, ADMINS)).usuarios.map((u) => u.email).sort();
    expect(await emails("ana")).toEqual(["ana@example.com"]);
    expect(await emails("BETO@")).toEqual(["beto@example.com"]);
    expect(await emails("pérez")).toEqual(["ana@example.com"]);
    expect(await emails("a+b")).toEqual(["a+b@example.com"]);
    expect(await emails(".*")).toEqual([]);
    expect(await emails("(")).toEqual([]);
  });

  it("muestra el rol vigente, si es de ADMIN_EMAILS, y solo los datos del panel", async () => {
    await crear("jefa@example.com", { nombre: "Jefa" });
    const id = await crear("b@example.com", { rol: "operador", bloqueado: true });
    const { usuarios } = await listarUsuarios({ q: "", pagina: 1 }, ADMINS);
    const jefa = usuarios.find((u) => u.email === "jefa@example.com")!;
    expect(jefa).toMatchObject({ rol: "admin", porEntorno: true, bloqueado: false, accesos: 0 });
    expect(usuarios.find((u) => u.id === id)).toMatchObject({ rol: "operador", porEntorno: false, bloqueado: true });
    expect(Object.keys(jefa).sort()).toEqual(
      ["accesos", "bloqueado", "creadoEn", "email", "id", "nombre", "porEntorno", "rol", "ultimoAcceso"].sort(),
    );
  });

  it("un usuario de antes de #49 se lista normalizado (sin creerle el rol guardado)", async () => {
    await Usuario.collection.insertOne({ email: "viejo@example.com", nombre: "", imagen: "", rol: "admin", ultimoAcceso: new Date() });
    const { usuarios } = await listarUsuarios({ q: "", pagina: 1 }, ADMINS);
    expect(usuarios[0]).toMatchObject({ email: "viejo@example.com", rol: "usuario", bloqueado: false, accesos: 0 });
  });
});

describe("cambiarRolUsuario", () => {
  it("cambia el rol guardado y buscarRol lo ve sin volver a ingresar", async () => {
    const actor = await crear("yo@example.com", { rol: "admin" });
    const id = await crear("v@example.com");
    expect(await cambiarRolUsuario(actor, id, "operador", ADMINS)).toEqual({ ok: true });
    expect(await buscarRol(id, ADMINS)).toBe("operador");
    expect(await cambiarRolUsuario(actor, id, "admin", ADMINS)).toEqual({ ok: true });
    expect(await buscarRol(id, ADMINS)).toBe("admin");
  });

  it("a un email de ADMIN_EMAILS no se lo degrada", async () => {
    const actor = await crear("yo@example.com", { rol: "admin" });
    const id = await crear("jefa@example.com");
    expect(await cambiarRolUsuario(actor, id, "usuario", ADMINS)).toEqual({ ok: false, error: "entorno" });
    expect(await buscarRol(id, ADMINS)).toBe("admin");
  });

  it("un admin no se degrada a sí mismo", async () => {
    const actor = await crear("yo@example.com", { rol: "admin" });
    expect(await cambiarRolUsuario(actor, actor, "usuario", "")).toEqual({ ok: false, error: "propio" });
    expect(await buscarRol(actor, "")).toBe("admin");
  });

  it("no deja el sitio sin ningún admin", async () => {
    // El actor ya no es admin (lo degradaron mientras tanto) y el objetivo es el único que queda.
    const actor = await crear("ex@example.com", { rol: "operador" });
    const unico = await crear("unico@example.com", { rol: "admin" });
    expect(await cambiarRolUsuario(actor, unico, "usuario", "")).toEqual({ ok: false, error: "ultimo-admin" });
    expect(await buscarRol(unico, "")).toBe("admin");
  });

  it("rechaza un rol o un id inválido, y un usuario que no existe", async () => {
    const actor = await crear("yo@example.com", { rol: "admin" });
    const id = await crear("v@example.com");
    expect(await cambiarRolUsuario(actor, id, "superadmin", ADMINS)).toEqual({ ok: false, error: "invalido" });
    expect(await cambiarRolUsuario(actor, { $ne: null }, "admin", ADMINS)).toEqual({ ok: false, error: "invalido" });
    expect(await cambiarRolUsuario(actor, "no-es-id", "admin", ADMINS)).toEqual({ ok: false, error: "invalido" });
    expect(await cambiarRolUsuario(actor, "64b7f0f0f0f0f0f0f0f0f0f0", "admin", ADMINS)).toEqual({ ok: false, error: "no-encontrado" });
    expect(await buscarRol(id, ADMINS)).toBe("usuario");
  });
});

describe("cambiarBloqueoUsuario", () => {
  it("bloquear corta los permisos y el ingreso; desbloquear los devuelve", async () => {
    const actor = await crear("yo@example.com", { rol: "admin" });
    const id = await crear("v@example.com", { rol: "operador" });
    expect(await cambiarBloqueoUsuario(actor, id, true, ADMINS)).toEqual({ ok: true });
    expect(await buscarRol(id, ADMINS)).toBe("bloqueado");
    expect(await usuarioBloqueado("v@example.com")).toBe(true);
    expect(await cambiarBloqueoUsuario(actor, id, false, ADMINS)).toEqual({ ok: true });
    expect(await buscarRol(id, ADMINS)).toBe("operador");
  });

  it("un admin no se bloquea a sí mismo", async () => {
    const actor = await crear("yo@example.com", { rol: "admin" });
    expect(await cambiarBloqueoUsuario(actor, actor, true, ADMINS)).toEqual({ ok: false, error: "propio" });
    expect(await buscarRol(actor, ADMINS)).toBe("admin");
  });

  it("a un email de ADMIN_EMAILS no se lo bloquea", async () => {
    const actor = await crear("yo@example.com", { rol: "admin" });
    const id = await crear("jefa@example.com");
    expect(await cambiarBloqueoUsuario(actor, id, true, ADMINS)).toEqual({ ok: false, error: "entorno" });
    expect(await usuarioBloqueado("jefa@example.com")).toBe(false);
  });

  it("no bloquea al único admin", async () => {
    const actor = await crear("ex@example.com", { rol: "operador" });
    const unico = await crear("unico@example.com", { rol: "admin" });
    expect(await cambiarBloqueoUsuario(actor, unico, true, "")).toEqual({ ok: false, error: "ultimo-admin" });
  });

  it("solo acepta true o false", async () => {
    const actor = await crear("yo@example.com", { rol: "admin" });
    const id = await crear("v@example.com");
    expect(await cambiarBloqueoUsuario(actor, id, "true", ADMINS)).toEqual({ ok: false, error: "invalido" });
    expect(await usuarioBloqueado("v@example.com")).toBe(false);
  });
});
