"use client";

/** Borrar pide confirmación: no se puede deshacer. El permiso lo exige la acción en el servidor. */
export function BotonBorrar({
  accion,
  titulo,
  className,
}: {
  accion: () => Promise<void>;
  titulo: string;
  className: string;
}) {
  return (
    <form
      action={accion}
      onSubmit={(e) => {
        if (!window.confirm(`¿Borrar el servicio "${titulo}"? No se puede deshacer.`)) e.preventDefault();
      }}
    >
      <button type="submit" className={className}>
        Borrar
      </button>
    </form>
  );
}
