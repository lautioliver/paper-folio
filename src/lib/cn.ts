export type ClassValue = string | false | null | undefined;

/**
 * Une clases y descarta las vacías, para las condicionales: `cn("p-4", isActive && "bg-black")`.
 * No resuelve conflictos de Tailwind: `cn("px-4", "px-0")` deja las dos y gana la que el CSS genere después.
 */
export function cn(...classes: ClassValue[]): string {
  return classes.filter(Boolean).join(" ");
}
