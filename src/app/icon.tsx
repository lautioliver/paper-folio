import { ImageResponse } from "next/og";
import { prepararIcono } from "@/lib/icono-marca";

// Pestaña del navegador. El logo y sus colores están en src/lib/icono-marca.tsx.
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default async function Icon() {
  const { elemento, fuente } = await prepararIcono(size.width);
  return new ImageResponse(elemento, {
    ...size,
    fonts: [{ name: "Onest", data: fuente, style: "normal", weight: 700 }],
  });
}
