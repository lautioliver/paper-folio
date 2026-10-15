// Los menús de la barra (el de celular y el de la cuenta) no pueden estar abiertos a la vez: el que se abre
// avisa por acá y el otro se cierra. Un EventTarget propio, sin tocar `window`, para poder probarlo.
const canal = new EventTarget();

/** Avisa que el menú `id` se abrió: los demás se cierran. */
export function avisarMenuAbierto(id: string): void {
  canal.dispatchEvent(new CustomEvent<string>("abierto", { detail: id }));
}

/** Llama a `cerrar` cuando se abre un menú que no es `id`. Devuelve la función para dejar de escuchar. */
export function alAbrirOtroMenu(id: string, cerrar: () => void): () => void {
  const escucha = (evento: Event) => {
    if ((evento as CustomEvent<string>).detail !== id) cerrar();
  };
  canal.addEventListener("abierto", escucha);
  return () => canal.removeEventListener("abierto", escucha);
}
