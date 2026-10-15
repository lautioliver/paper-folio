export type Env = { MONGODB_URI: string; MONGODB_DB: string };

export function leerEnv(_fuente: Record<string, string | undefined> = process.env): Env {
  return { MONGODB_URI: "", MONGODB_DB: "" };
}
