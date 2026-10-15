export type ResultadoSeed = {
  proyectos: { creados: number; existentes: number };
  demos: { creadas: number };
  servicios: { creados: number; existentes: number };
};

export async function sembrarContenido(): Promise<ResultadoSeed> {
  return { proyectos: { creados: 0, existentes: 0 }, demos: { creadas: 0 }, servicios: { creados: 0, existentes: 0 } };
}
