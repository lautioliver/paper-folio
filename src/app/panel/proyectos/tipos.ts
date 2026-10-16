import type { ValoresFormulario } from "@/lib/proyecto-entrada";

/**
 * Estado del formulario de un proyecto (`useActionState`). Si falló, `campos` trae el error de cada campo y
 * `valores` lo que se mandó, para volver a mostrarlo: `intento` cambia en cada envío fallido y remonta los
 * campos con esos valores (React resetea el formulario después de cada acción).
 */
export type EstadoFormulario = {
  error: string | null;
  campos: Record<string, string>;
  valores: ValoresFormulario | null;
  intento: number;
};
export const FORMULARIO_INICIAL: EstadoFormulario = { error: null, campos: {}, valores: null, intento: 0 };

/** Estado de las acciones de la lista (publicar, borrar, reordenar): `error` es `null` si salió bien. */
export type EstadoAccion = { error: string | null };
export const SIN_ERROR: EstadoAccion = { error: null };
