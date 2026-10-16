/**
 * Decide cuándo `ContadorVisitas` manda el aviso de una visita, según los montajes de su efecto.
 *
 * - Cada cambio de ruta cuenta.
 * - El doble efecto de StrictMode (en desarrollo: desmonta y vuelve a montar enseguida, con la misma ruta)
 *   cuenta una sola vez.
 * - La vuelta a una ruta después de quedar oculta cuenta: con `cacheComponents`, Next guarda el layout de
 *   `(sitio)` en un `<Activity>` oculto al ir a `/ingresar` o `/panel`, y al volver solo se vuelven a montar
 *   los efectos (el estado y las refs sobreviven).
 *
 * La diferencia entre los dos últimos: StrictMode monta otra vez en el mismo commit, antes de que corra un
 * timer; una navegación a otra ruta termina después. Por eso `desmontar` olvida la última ruta en un timer,
 * y un `montar` inmediato lo cancela.
 */
export type Deduplicador = { montar(ruta: string): boolean; desmontar(): void };

export function crearDeduplicador(): Deduplicador {
  let ultima: string | null = null;
  let olvido: ReturnType<typeof setTimeout> | undefined;
  return {
    montar(ruta) {
      clearTimeout(olvido);
      olvido = undefined;
      if (ultima === ruta) return false;
      ultima = ruta;
      return true;
    },
    desmontar() {
      clearTimeout(olvido);
      olvido = setTimeout(() => {
        ultima = null;
      }, 0);
    },
  };
}
