import { ETIQUETAS_ESTADO, type EstadoConsulta } from "@/lib/estados-consulta";

const COLORES: Record<EstadoConsulta, string> = {
  nueva: "bg-primario text-tinta",
  en_curso: "bg-secundario text-papel",
  respondida: "bg-superficie text-tinta",
  archivada: "bg-papel text-tinta",
};

export function ChipEstado({ estado }: { estado: EstadoConsulta }) {
  return (
    <span
      className={`rounded-full border-2 border-tinta px-3 py-0.5 text-pequeno font-bold ${COLORES[estado]}`}
    >
      {ETIQUETAS_ESTADO[estado]}
    </span>
  );
}
