import type { CampoServicio } from "@/lib/servicios-campos";

/** Lo que el formulario mandó, para volver a mostrarlo si falló (React resetea el formulario). */
export type ValoresFormulario = {
  titulo: string;
  descripcion: string;
  ilustracion: string;
  icono: string;
  imagen: string;
  publicado: boolean;
};

/** Lo que devuelve la acción del formulario a `useActionState`: `error` es `null` si no hubo envío o salió bien. */
export type EstadoFormulario = {
  error: string | null;
  campos: Partial<Record<CampoServicio, string>>;
  valores?: ValoresFormulario;
  /** Cuántas respuestas de la acción hubo (la clave para volver a montar los campos). */
  envio?: number;
};

export const FORMULARIO_INICIAL: EstadoFormulario = { error: null, campos: {} };

/** Los valores con los que se arma el formulario: los del último envío fallido o, si no hubo, los iniciales. */
export function valoresAMostrar(estado: EstadoFormulario, inicial: ValoresFormulario): ValoresFormulario {
  void estado;
  return inicial;
}

/** Clave de los campos del formulario: cambia con cada respuesta de la acción, así se vuelven a montar. */
export function claveDelFormulario(estado: EstadoFormulario): string {
  void estado;
  return "0";
}
