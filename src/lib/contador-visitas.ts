export type Deduplicador = { montar(ruta: string): boolean; desmontar(): void };

export function crearDeduplicador(): Deduplicador {
  let ultima: string | null = null;
  return {
    montar(ruta) {
      if (ultima === ruta) return false;
      ultima = ruta;
      return true;
    },
    desmontar() {},
  };
}
