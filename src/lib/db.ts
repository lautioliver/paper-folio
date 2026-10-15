import mongoose from "mongoose";
import { leerEnv } from "./env";

type CacheMongoose = { promesa: Promise<typeof mongoose> | null; escuchando?: boolean };

// En serverless (Vercel) el módulo se puede reevaluar con la misma instancia: la conexión
// se guarda en globalThis para no abrir una por invocación ni en cada recarga de `next dev`.
const global_ = globalThis as typeof globalThis & { __paperfolioMongoose?: CacheMongoose };
const cache: CacheMongoose = (global_.__paperfolioMongoose ??= { promesa: null });

/** Conecta con Mongoose y reusa la conexión. Nunca loguea la URI. */
export async function conectar(): Promise<typeof mongoose> {
  if (!cache.promesa) {
    // Solo `close` (cierre explícito) invalida el cache. En un corte o failover Mongoose pasa por
    // readyState 0 mientras el driver reintenta solo: reconectar a mano dejaría un cliente huérfano.
    if (!cache.escuchando) {
      cache.escuchando = true;
      mongoose.connection.on("close", () => {
        cache.promesa = null;
      });
    }
    const { MONGODB_URI, MONGODB_DB } = leerEnv();
    const promesa: Promise<typeof mongoose> = mongoose
      .connect(MONGODB_URI, {
        dbName: MONGODB_DB,
        bufferCommands: false,
        serverSelectionTimeoutMS: 5_000,
      })
      .catch((error: unknown) => {
        // El próximo intento reconecta en vez de repetir el fallo (solo si el cache sigue siendo esta promesa).
        if (cache.promesa === promesa) cache.promesa = null;
        throw error;
      });
    cache.promesa = promesa;
  }
  return cache.promesa;
}

/** Cierra la conexión y limpia el cache. Pensado para tests. */
export async function desconectar(): Promise<void> {
  const promesa = cache.promesa;
  cache.promesa = null;
  if (promesa) await promesa.catch(() => {});
  await mongoose.disconnect();
}

const indicesPorModelo = new Map<string, Promise<unknown>>();
let escuchandoIndices = false;

/**
 * Crea los índices de un modelo una vez por proceso. Los modelos tienen `autoIndex: false` porque con
 * `bufferCommands: false` el autoIndex corre sin conexión y falla; esto los crea después de `conectar()`.
 * Al cerrarse la conexión se olvidan, porque la próxima base puede no tenerlos.
 */
export function asegurarIndicesDe(modelo: { modelName: string; createIndexes(): Promise<unknown> }): Promise<unknown> {
  if (!escuchandoIndices) {
    escuchandoIndices = true;
    mongoose.connection.on("close", () => indicesPorModelo.clear());
  }
  let promesa = indicesPorModelo.get(modelo.modelName);
  if (!promesa) {
    promesa = modelo.createIndexes().catch((error: unknown) => {
      indicesPorModelo.delete(modelo.modelName);
      throw error;
    });
    indicesPorModelo.set(modelo.modelName, promesa);
  }
  return promesa;
}

