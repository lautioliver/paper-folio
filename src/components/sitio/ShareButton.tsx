"use client";

import { cn } from "@/lib/cn";
import { projectShareUrl, shareOrCopy, type ShareResult } from "@/lib/share";
import { useTransientMessage } from "@/lib/useTransientMessage";

const MESSAGES: Record<ShareResult, string> = {
  compartido: "",
  copiado: "Link copiado",
  cancelado: "",
  error: "No se pudo copiar el link",
};

type ShareButtonProps = {
  title: string;
  slug: string;
  className?: string;
};

/** "Compartir" el portfolio, en la tarjeta del proyecto, con Web Share API; sin ella copia el link y avisa en un role="status". */
export function ShareButton({ title, slug, className }: ShareButtonProps) {
  const [message, setMessage] = useTransientMessage();

  async function onClick() {
    const result = await shareOrCopy({ title, url: projectShareUrl(window.location.origin, slug) }, navigator);
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
