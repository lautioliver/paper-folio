// STUB
export const RUTA_USUARIOS = "/panel/usuarios";
export const LARGO_BUSQUEDA = 100;

export const AVISOS = {
  "rol-cambiado": { tipo: "ok", mensaje: "Listo: cambiamos el rol." },
  bloqueado: { tipo: "ok", mensaje: "Listo: bloqueamos la cuenta. Sus sesiones abiertas ya no tienen permisos." },
  desbloqueado: { tipo: "ok", mensaje: "Listo: desbloqueamos la cuenta." },
  propio: { tipo: "error", mensaje: "No podés cambiar tu propio rol ni bloquear tu cuenta." },
  entorno: { tipo: "error", mensaje: "Ese email está en ADMIN_EMAILS: es admin siempre y no se puede degradar ni bloquear." },
  "ultimo-admin": { tipo: "error", mensaje: "Es el único admin: el sitio no puede quedarse sin ninguno." },
  invalido: { tipo: "error", mensaje: "El pedido no es válido. Recargá la página y probá de nuevo." },
  "no-encontrado": { tipo: "error", mensaje: "Ese usuario ya no existe." },
} as const;
export type CodigoAviso = keyof typeof AVISOS;

export function filtrosDe(entrada: { q?: unknown; pagina?: unknown }): { q: string; pagina: number } {
  void entrada;
  return { q: "", pagina: 1 };
}

export function rutaUsuarios(opciones: { q?: string; pagina?: number; aviso?: CodigoAviso } = {}): string {
  void opciones;
  return RUTA_USUARIOS;
}

export function avisoDe(valor: unknown): (typeof AVISOS)[CodigoAviso] | null {
  void valor;
  return null;
}
