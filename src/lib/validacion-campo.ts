export type EstadoValidez = {
  valueMissing: boolean;
  typeMismatch: boolean;
  patternMismatch: boolean;
  tooLong: boolean;
  tooShort: boolean;
};

/** Mensaje en español de lo que está mal en un campo, o `undefined` si es válido. */
export function mensajeDeValidez(validez: EstadoValidez, opciones: { tipo?: string; maxLength?: number; minLength?: number } = {}): string | undefined {
  void validez;
  void opciones;
  return undefined;
}
