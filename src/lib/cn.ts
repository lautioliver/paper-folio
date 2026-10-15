export type ClassValue = string | false | null | undefined;

/** Une clases de Tailwind y descarta las vacías, para las condicionales: `cn("p-4", activo && "bg-black")`. */
export function cn(...classes: ClassValue[]): string {
  return classes.filter(Boolean).join(" ");
}
