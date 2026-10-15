"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import { shareOrCopy, type ShareResult } from "@/lib/share";

const MESSAGES: Record<ShareResult, string> = {
  compartido: "",
  copiado: "Link copiado",
  cancelado: "",
  error: "No se pudo copiar el link",
};

type ShareButtonProps = {
  title: string;
  url: string;
  className?: string;
};

/** "Compartir" con Web Share API; sin ella copia el link y avisa en un role="status". */
export function ShareButton({ title, url, className }: ShareButtonProps) {
  const [message, setMessage] = useState("");

  // El aviso se borra solo: así un segundo clic con el mismo resultado se vuelve a anunciar.
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(""), 3000);
    return () => clearTimeout(timer);
  }, [message]);

  async function onClick() {
    const result = await shareOrCopy({ title, url }, navigator);
    setMessage(MESSAGES[result]);
  }

  return (
    <span className="inline-flex items-center gap-3">
      <button type="button" onClick={onClick} className={cn("underline decoration-2 underline-offset-4", className)}>
        Compartir<span className="sr-only"> {title}</span>
      </button>
      <span role="status" className="text-xs font-normal">
        {message}
      </span>
    </span>
  );
}
