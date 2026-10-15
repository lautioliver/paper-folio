import { redirect } from "next/navigation";

// Por ahora el panel tiene una sola sección.
export default function PanelPage() {
  redirect("/panel/consultas");
}
