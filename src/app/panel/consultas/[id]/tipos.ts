/** Lo que devuelven las server actions del detalle a `useActionState`: `null` si salió bien. */
export type EstadoAccion = { error: string | null };
export const SIN_ERROR: EstadoAccion = { error: null };
