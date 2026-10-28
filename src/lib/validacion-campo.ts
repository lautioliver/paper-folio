export type EstadoValidez = {
  valueMissing: boolean;
  typeMismatch: boolean;
  patternMismatch: boolean;
  tooLong: boolean;
  tooShort: boolean;
};

type Opciones = { tipo?: string; maxLength?: number; minLength?: number };

/**
 * Mensaje en español de lo que está mal en un campo (a partir de su `ValidityState`), o `undefined` si es
 * válido. Es solo ayuda: la validación que vale es la del servidor.
 */
export function mensajeDeValidez(
  validez: EstadoValidez,
  { tipo, maxLength, minLength }: Opciones = {},
): string | undefined {
  if (validez.valueMissing) return "Completá este campo, es obligatorio.";
  if (validez.typeMismatch) {
    return tipo === "email" ? "Ese email no es válido." : "Escribí una URL válida, con https://.";
  }
  if (validez.tooShort) return `Tiene que tener al menos ${minLength} caracteres.`;
  if (validez.tooLong) return `No puede pasar los ${maxLength} caracteres.`;
  if (validez.patternMismatch) return "El formato no es válido.";
  return undefined;
}
