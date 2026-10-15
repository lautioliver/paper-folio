"use client";

import { useEffect, useState } from "react";

/**
 * Aviso que se borra solo (3 s). Cada llamada reinicia el plazo, aun con el mismo texto, y el aviso
 * se borra un instante antes de repetirse para que un role="status" lo vuelva a anunciar.
 */
export function useTransientMessage(): [string, (message: string) => void] {
  const [state, setState] = useState({ text: "", n: 0 });
  useEffect(() => {
    if (!state.text) return;
    const timer = setTimeout(() => setState((s) => ({ ...s, text: "" })), 3000);
    return () => clearTimeout(timer);
  }, [state]);
  return [state.text, (text) => setState((s) => ({ text, n: s.n + 1 }))];
}
