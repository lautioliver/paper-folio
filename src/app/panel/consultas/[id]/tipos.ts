/**
 * Lo que devuelven las server actions del detalle a `useActionState`: `error` es `null` si salió bien.
 * `texto` es la nota que hay que volver a mostrar: React resetea el formulario después de cada acción, así
 * que si falló vuelve la que se mandó (para no perderla) y si salió bien vuelve vacía.
 */
export type EstadoAccion = { error: string | null; texto?: string };
export const SIN_ERROR: EstadoAccion = { error: null };
