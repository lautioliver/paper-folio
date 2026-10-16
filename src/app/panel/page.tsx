import { redirect } from "next/navigation";

// Consultas es la sección que ven todos los roles del panel (operador y admin).
export default function PanelPage() {
  redirect("/panel/consultas");
}
