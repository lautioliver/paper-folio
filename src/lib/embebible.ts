export type Embebible = "si" | "no" | "desconocido";

export function permiteEmbeber(_cabeceras: Headers, _origenSitio: string, _urlDemo: string): boolean {
  return true;
}

export function origenDelSitio(_env: Record<string, string | undefined> = process.env): string {
  return "";
}

export async function consultarEmbebible(
  _url: string,
  _origenSitio: string,
  _opciones: { fetch?: typeof fetch; timeoutMs?: number } = {},
): Promise<Embebible> {
  return "si";
}

export async function demoEmbebible(_url: string, _origenSitio: string): Promise<Embebible> {
  return "si";
}
