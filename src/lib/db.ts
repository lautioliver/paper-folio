import mongoose from "mongoose";
import { leerEnv } from "./env";

type CacheMongoose = { promesa: Promise<typeof mongoose> | null };

// En serverless (Vercel) el módulo se puede reevaluar con la misma instancia: la conexión
// se guarda en globalThis para no abrir una por invocación ni en cada recarga de `next dev`.
const global_ = globalThis as typeof globalThis & { __paperfolioMongoose?: CacheMongoose };
const cache: CacheMongoose = (global_.__paperfolioMongoose ??= { promesa: null });

/** Conecta con Mongoose y reusa la conexión. Nunca loguea la URI. */
export async function conectar(): Promise<typeof mongoose> {
  // readyState 0: la conexión se cerró (disconnect() o reintentos agotados), la promesa vieja ya no sirve.
  if (cache.promesa && mongoose.connection.readyState === 0) cache.promesa = null;
  if (!cache.promesa) {
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
