import { generarIcono } from "@/lib/icono-marca";

// Pestaña del navegador. El logo y sus colores están en src/lib/icono-marca.tsx.
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return generarIcono(size.width);
}
