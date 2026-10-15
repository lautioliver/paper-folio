/**
 * IP del visitante según los encabezados del proxy: primer valor de `x-forwarded-for` (el cliente;
 * Vercel lo fija) o `x-real-ip`. Devuelve "" si no hay ninguna: quien llama decide qué hacer.
 */
export function leerIp(headers: Headers): string {
  const reenviada = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (reenviada) return reenviada;
  return headers.get("x-real-ip")?.trim() ?? "";
}
