"use client";

import { cn } from "@/lib/cn";
import { copyText } from "@/lib/share";
import { useTransientMessage } from "@/lib/useTransientMessage";

type CopyProfileLinkProps = {
  className?: string;
};

/** Copia el link del perfil (esta página) con la Clipboard API y avisa "Copiado" en un role="status". */
export function CopyProfileLink({ className }: CopyProfileLinkProps) {
  const [message, setMessage] = useTransientMessage();

  async function onClick() {
    const ok = await copyText(`${window.location.origin}/`, navigator);
    setMessage(ok ? "Copiado" : "No se pudo copiar el link");
  }

  return (
    <div className="mt-6 flex flex-wrap items-center gap-3">
      <button type="button" onClick={onClick} className={cn(className)}>
        Copiar link del perfil
      </button>
      <span role="status" className="text-pequeno font-bold">
        {message}
      </span>
    </div>
  );
}
