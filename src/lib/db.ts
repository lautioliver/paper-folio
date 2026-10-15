import mongoose from "mongoose";

export async function desconectar(): Promise<void> {}

export async function conectar(): Promise<typeof mongoose> {
  return mongoose;
}
