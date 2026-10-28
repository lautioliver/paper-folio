/** Categorías distintas, en el orden en que aparecen. */
export function categoriasDe(items: { categoria: string }[]): string[] {
  return [];
}

/** Con `categoria` null devuelve todo; si no, solo lo de esa categoría. */
export function filtrarPorCategoria<T extends { categoria: string }>(items: T[], categoria: string | null): T[] {
  return [];
}
