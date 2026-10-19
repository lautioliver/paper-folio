import type { CampoDemo } from "@/lib/demos-campos";

/** Lo que el formulario mandó, para volver a mostrarlo si falló (React resetea el formulario). */
export type ValoresFormulario = {
  proyecto: string;
  titulo: string;
  url: string;
  descripcion: string;
  activa: boolean;
};

/** Lo que devuelve la acción del formulario a `useActionState`: `error` es `null` si no hubo envío o salió bien. */
export type EstadoFormulario = {
  error: string | null;
  campos: Partial<Record<CampoDemo, string>>;
  valores?: ValoresFormulario;
  /** Cuántas respuestas de la acción hubo (la clave para volver a montar los campos). */
  envio?: number;
};

export const FORMULARIO_INICIAL: EstadoFormulario = { error: null, campos: {} };

/** Los valores con los que se arma el formulario: los del último envío fallido o, si no hubo, los iniciales. */
export function valoresAMostrar(estado: EstadoFormulario, inicial: ValoresFormulario): ValoresFormulario {
  return estado.valores ?? inicial;
}

/**
 * Clave de los campos del formulario: cambia con cada respuesta de la acción, así se vuelven a montar con
 * `valoresAMostrar` como valores por defecto. React 19 resetea el formulario después de la acción, y un
 * control no controlado (el select del proyecto, el checkbox) volvería a sus valores iniciales.
 */
export function claveDelFormulario(estado: EstadoFormulario): string {
  return String(estado.envio ?? 0);
}

/** Estado de las acciones de la lista (activar o publicar, mover, borrar): `error` es `null` si salió bien. */
export type EstadoAccion = { error: string | null };
export const SIN_ERROR: EstadoAccion = { error: null };
