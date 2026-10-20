import { generarIcono } from "@/lib/icono-marca";

// Ícono para la pantalla de inicio de iOS. Va opaco: iOS pinta de negro lo transparente.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return generarIcono(size.width, { opaco: true });
}
