import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    // Ningún test puede mandar un email real, aunque la clave esté exportada en el shell.
    env: { RESEND_API_KEY: "", CONTACTO_EMAIL_DESTINO: "" },
    // Solo .ts: los tests de componentes (.tsx) necesitan un DOM (jsdom), que todavía no está instalado.
    include: ["src/**/*.test.ts"],
  },
});
