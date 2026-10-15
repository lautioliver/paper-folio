// Colores de la paleta como clases de Tailwind, en un solo lugar.
export type Tone = "primario" | "acento" | "secundario" | "terciario";

export const TONE_BG: Record<Tone, string> = {
  primario: "bg-primario",
  acento: "bg-acento",
  secundario: "bg-secundario",
  terciario: "bg-terciario",
};

// Texto legible sobre cada tono (manual: blanco solo sobre azul e índigo, en títulos grandes).
export const TONE_TEXT: Record<Tone, string> = {
  primario: "text-tinta",
  acento: "text-tinta",
  secundario: "text-papel",
  terciario: "text-papel",
};

// Fondo del panel de ilustración de cada proyecto: contrasta con el color de su inicial.
export const PANEL_BG: Record<Tone, string> = {
  primario: "bg-secundario",
  acento: "bg-terciario",
  secundario: "bg-secundario",
  terciario: "bg-terciario",
};
