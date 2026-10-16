import type { CampoServicio } from "@/lib/servicios-admin";

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
};

export const FORMULARIO_INICIAL: EstadoFormulario = { error: null, campos: {} };
