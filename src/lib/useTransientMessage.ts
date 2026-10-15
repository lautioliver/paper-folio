"use client";

import { useEffect, useState } from "react";

/**
 * Aviso que se borra solo (3 s): así un segundo clic con el mismo resultado se vuelve a anunciar
 * en un role="status".
 */
export function useTransientMessage(): [string, (message: string) => void] {
  const [message, setMessage] = useState("");
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(""), 3000);
    return () => clearTimeout(timer);
  }, [message]);
  return [message, setMessage];
}
