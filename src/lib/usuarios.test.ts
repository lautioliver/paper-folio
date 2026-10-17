import { MongoMemoryServer } from "mongodb-memory-server";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { conectar, desconectar } from "./db";
import { fechaDeMetrica } from "./fecha-metricas";
import { buscarRol, CuentaBloqueadaError, normalizarLegados, registrarIngreso, usuarioBloqueado } from "./usuarios";
import { AccesoDiario } from "@/models/AccesoDiario";
import { Usuario } from "@/models/Usuario";

const ADMINS = " Admin@Example.com , otra@example.com";

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
  await AccesoDiario.deleteMany({});
});

afterEach(() => {
  vi.restoreAllMocks();
});

afterAll(async () => {
  await desconectar();
  await servidor.stop();
});

describe("registrarIngreso", () => {
  it("un email nuevo crea un usuario con rol usuario y el email en minúsculas", async () => {
    const r = await registrarIngreso({ email: "Visita@Example.com", nombre: "Visita", imagen: "https://example.com/a.png" }, ADMINS);
    expect(r.rol).toBe("usuario");
    expect(r.email).toBe("visita@example.com");
    const doc = await Usuario.findById(r.id).lean();
    expect(doc).toMatchObject({ email: "visita@example.com", nombre: "Visita", rol: "usuario" });
    expect(doc?.creadoEn).toBeInstanceOf(Date);
    expect(doc?.ultimoAcceso).toBeInstanceOf(Date);
  });

  it("un usuario nuevo queda con bloqueado false y su primer ingreso contado (#49, #54)", async () => {
    const r = await registrarIngreso({ email: "nuevo@example.com" }, ADMINS);
    expect(await Usuario.findById(r.id).lean()).toMatchObject({ rol: "usuario", bloqueado: false, accesos: 1 });
  });

  it("un email de ADMIN_EMAILS ingresa como admin, sin guardar admin en la base (así sacarlo de la lista lo revoca)", async () => {
    const r = await registrarIngreso({ email: "admin@example.com" }, ADMINS);
    expect(r.rol).toBe("admin");
    expect((await Usuario.findById(r.id).lean())?.rol).toBe("usuario");
  });

  it("el ingreso no pisa el rol asignado desde el panel (#49)", async () => {
    const r = await registrarIngreso({ email: "ope@example.com" }, ADMINS);
    await Usuario.updateOne({ _id: r.id }, { $set: { rol: "operador" } });
    const otra = await registrarIngreso({ email: "ope@example.com" }, ADMINS);
    expect(otra.rol).toBe("operador");
    expect((await Usuario.findById(r.id).lean())?.rol).toBe("operador");
    expect(await Usuario.countDocuments()).toBe(1);
  });

  it("actualiza nombre, imagen y ultimoAcceso sin cambiar creadoEn", async () => {
    const r = await registrarIngreso({ email: "v@example.com", nombre: "Viejo" }, ADMINS);
    const antes = await Usuario.findById(r.id).lean();
    await new Promise((ok) => setTimeout(ok, 10));
    await registrarIngreso({ email: "v@example.com", nombre: "Nuevo", imagen: "https://example.com/b.png" }, ADMINS);
    const despues = await Usuario.findById(r.id).lean();
    expect(despues?.nombre).toBe("Nuevo");
    expect(despues?.imagen).toBe("https://example.com/b.png");
    expect(despues?.creadoEn?.getTime()).toBe(antes?.creadoEn?.getTime());
    expect(despues!.ultimoAcceso.getTime()).toBeGreaterThan(antes!.ultimoAcceso.getTime());
  });

  it("rechaza un email inválido sin guardar nada", async () => {
    await expect(registrarIngreso({ email: "no-es-email" }, ADMINS)).rejects.toThrow();
    expect(await Usuario.countDocuments()).toBe(0);
  });

  it("el índice de email es único", async () => {
    await registrarIngreso({ email: "u@example.com" }, ADMINS);
    await expect(Usuario.create({ email: "u@example.com", ultimoAcceso: new Date() })).rejects.toThrow(/duplicate key/);
  });
});

describe("registrarIngreso cuenta el acceso (#54)", () => {
  it("dos ingresos del mismo usuario el mismo día dan accesos_diarios con total: 2 y usuarios.accesos en 2", async () => {
    const fecha = fechaDeMetrica(new Date());
    const r = await registrarIngreso({ email: "ana@example.com" }, ADMINS);
    await registrarIngreso({ email: "ana@example.com" }, ADMINS);
    // Si el test cruzó la medianoche de Salta, cada ingreso cayó en un día distinto: se suman los dos.
    const docs = await AccesoDiario.find({ tipo: "ingreso" }, { _id: 0, total: 1, fecha: 1 }).sort({ fecha: 1 }).lean();
    expect(docs.reduce((suma, d) => suma + d.total, 0)).toBe(2);
    expect(docs[0].fecha).toBe(fecha);
    if (docs.length === 1) expect(docs[0].total).toBe(2);
    expect((await Usuario.findById(r.id).lean())?.accesos).toBe(2);
  });

  it("un admin que ingresa también suma un acceso, a diferencia de las visitas (decisión de @lautioliver en #54)", async () => {
    // Admin por ADMIN_EMAILS y admin guardado en la base: los dos cuentan.
    const porEntorno = await registrarIngreso({ email: "admin@example.com" }, ADMINS);
    expect(porEntorno.rol).toBe("admin");
    const guardado = await registrarIngreso({ email: "jefa@example.com" }, ADMINS);
    await Usuario.updateOne({ _id: guardado.id }, { $set: { rol: "admin" } });
    expect((await registrarIngreso({ email: "jefa@example.com" }, ADMINS)).rol).toBe("admin");
    expect((await Usuario.findById(porEntorno.id).lean())?.accesos).toBe(1);
    expect((await Usuario.findById(guardado.id).lean())?.accesos).toBe(2);
    const docs = await AccesoDiario.find({ tipo: "ingreso" }, { _id: 0, total: 1 }).lean();
    expect(docs.reduce((suma, d) => suma + d.total, 0)).toBe(3);
  });

  it("una cuenta bloqueada no cuenta un acceso", async () => {
    const r = await registrarIngreso({ email: "ana@example.com" }, ADMINS);
    await Usuario.updateOne({ _id: r.id }, { $set: { bloqueado: true } });
    await expect(registrarIngreso({ email: "ana@example.com" }, ADMINS)).rejects.toBeInstanceOf(CuentaBloqueadaError);
    expect((await Usuario.findById(r.id).lean())?.accesos).toBe(1);
    expect((await AccesoDiario.findOne({ tipo: "ingreso" }).lean())?.total).toBe(1);
  });

  it("si la base falla al contar, el ingreso no se corta", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(AccesoDiario, "updateOne").mockRejectedValue(
      Object.assign(new Error("mongodb://usuario:secreto@host"), { name: "MongoServerError" }),
    );
    const r = await registrarIngreso({ email: "ana@example.com" }, ADMINS);
    expect(r).toMatchObject({ email: "ana@example.com", rol: "usuario" });
    expect(error).toHaveBeenCalled();
    expect(JSON.stringify(error.mock.calls)).not.toContain("secreto");
  });
});

describe("buscarRol (#49: el rol guardado manda, ADMIN_EMAILS siempre es admin)", () => {
  it("cambiar el rol en la base se refleja sin volver a ingresar", async () => {
    const r = await registrarIngreso({ email: "v@example.com" }, ADMINS);
    expect(await buscarRol(r.id, ADMINS)).toBe("usuario");
    await Usuario.updateOne({ _id: r.id }, { $set: { rol: "operador" } });
    expect(await buscarRol(r.id, ADMINS)).toBe("operador");
    await Usuario.updateOne({ _id: r.id }, { $set: { rol: "admin" } });
    expect(await buscarRol(r.id, ADMINS)).toBe("admin");
  });

  it("un email de ADMIN_EMAILS es admin; si lo sacan de la lista vuelve a su rol guardado sin volver a ingresar", async () => {
    const r = await registrarIngreso({ email: "admin@example.com" }, ADMINS);
    expect(await buscarRol(r.id, ADMINS)).toBe("admin");
    expect(await buscarRol(r.id, "")).toBe("usuario");
  });

  it("un usuario bloqueado → bloqueado, aunque esté en ADMIN_EMAILS", async () => {
    const r = await registrarIngreso({ email: "admin@example.com" }, ADMINS);
    await Usuario.updateOne({ _id: r.id }, { $set: { bloqueado: true } });
    expect(await buscarRol(r.id, ADMINS)).toBe("bloqueado");
  });

  it("devuelve null si el usuario no existe o el id no es válido", async () => {
    expect(await buscarRol("64b7f0f0f0f0f0f0f0f0f0f0", ADMINS)).toBeNull();
    expect(await buscarRol("no-es-un-id", ADMINS)).toBeNull();
  });
});

// Antes de #49 el rol guardado no valía: se recalculaba con ADMIN_EMAILS y OPERADOR_EMAILS en cada lectura.
// Un documento de entonces (sin `bloqueado`) puede tener un rol viejo: el de alguien que salió de la lista y
// no volvió a ingresar. No se le cree: vale `usuario` (más ADMIN_EMAILS) hasta que se normaliza.
describe("usuarios de antes de #49 (sin bloqueado ni accesos)", () => {
  async function legado(email: string, rol: string) {
    const { insertedId } = await Usuario.collection.insertOne({ email, nombre: "", imagen: "", rol, ultimoAcceso: new Date() });
    return String(insertedId);
  }

  it("buscarRol no le cree el rol guardado: usuario, o admin si está en ADMIN_EMAILS", async () => {
    const exAdmin = await legado("ex@example.com", "admin");
    const exOperador = await legado("ope@example.com", "operador");
    const admin = await legado("admin@example.com", "admin");
    expect(await buscarRol(exAdmin, ADMINS)).toBe("usuario");
    expect(await buscarRol(exOperador, ADMINS)).toBe("usuario");
    expect(await buscarRol(admin, ADMINS)).toBe("admin");
  });

  it("normalizarLegados los deja como usuario, sin bloquear y con 0 accesos, y es idempotente", async () => {
    const id = await legado("ex@example.com", "admin");
    await normalizarLegados();
    expect(await Usuario.findById(id).lean()).toMatchObject({ rol: "usuario", bloqueado: false, accesos: 0 });
    // Después, el rol que se asigna desde el panel ya no lo toca otra normalización.
    await Usuario.updateOne({ _id: id }, { $set: { rol: "operador" } });
    await normalizarLegados();
    expect((await Usuario.findById(id).lean())?.rol).toBe("operador");
    expect(await buscarRol(id, ADMINS)).toBe("operador");
  });

  it("al ingresar se normaliza", async () => {
    const id = await legado("ex@example.com", "admin");
    const r = await registrarIngreso({ email: "ex@example.com" }, ADMINS);
    expect(r).toMatchObject({ id, rol: "usuario" });
    // Sin `accesos` guardado: el `$inc` del ingreso (#54) lo deja en 1.
    expect(await Usuario.findById(id).lean()).toMatchObject({ rol: "usuario", bloqueado: false, accesos: 1 });
  });
});

describe("usuarioBloqueado", () => {
  it("true solo si existe y está bloqueado (sin importar mayúsculas)", async () => {
    const r = await registrarIngreso({ email: "b@example.com" }, ADMINS);
    expect(await usuarioBloqueado("b@example.com")).toBe(false);
    await Usuario.updateOne({ _id: r.id }, { $set: { bloqueado: true } });
    expect(await usuarioBloqueado(" B@Example.com ")).toBe(true);
    expect(await usuarioBloqueado("nadie@example.com")).toBe(false);
  });
});

describe("registrarIngreso de una cuenta bloqueada", () => {
  it("lanza CuentaBloqueadaError (defensa por si el callback signIn no la frenó)", async () => {
    const r = await registrarIngreso({ email: "b@example.com" }, ADMINS);
    await Usuario.updateOne({ _id: r.id }, { $set: { bloqueado: true } });
    await expect(registrarIngreso({ email: "b@example.com" }, ADMINS)).rejects.toThrow(CuentaBloqueadaError);
  });
});
