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
