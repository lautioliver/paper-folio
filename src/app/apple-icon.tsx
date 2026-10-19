import { ImageResponse } from "next/og";
import { prepararIcono } from "@/lib/icono-marca";

// Ícono para la pantalla de inicio de iOS. El logo y sus colores están en src/lib/icono-marca.tsx.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default async function AppleIcon() {
  const { elemento, fuente } = await prepararIcono(size.width);
  return new ImageResponse(elemento, {
    ...size,
    fonts: [{ name: "Onest", data: fuente, style: "normal", weight: 700 }],
  });
}
