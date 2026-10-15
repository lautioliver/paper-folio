export type ShareResult = "compartido" | "copiado" | "cancelado" | "error";

export type ShareData = { title: string; url: string };

// Subconjunto de Navigator que usamos: se inyecta en los tests.
export type ShareNavigator = {
  share?: (data: ShareData) => Promise<void>;
  clipboard?: { writeText: (text: string) => Promise<void> };
};

/** Copia al portapapeles. Devuelve false (sin lanzar) si no hay API o el navegador la rechaza. */
export async function copyText(text: string, nav: ShareNavigator): Promise<boolean> {
  if (!nav.clipboard?.writeText) return false;
  try {
    await nav.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/**
 * Web Share API; si el navegador no la tiene (o falla) cae a copiar el link. Cancelar el diálogo
 * (AbortError) no es un error: no se copia nada.
 */
export async function shareOrCopy(data: ShareData, nav: ShareNavigator): Promise<ShareResult> {
  if (typeof nav.share === "function") {
    try {
      await nav.share({ title: data.title, url: data.url });
      return "compartido";
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return "cancelado";
    }
  }
  return (await copyText(data.url, nav)) ? "copiado" : "error";
}

/** Link al portfolio apuntando a la tarjeta de un proyecto. */
export function projectShareUrl(_origin: string, _slug: string): string {
  return "";
}
