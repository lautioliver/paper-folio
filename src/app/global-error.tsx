"use client";

// Reemplaza al layout raíz cuando falla él mismo: no carga los estilos globales, por eso va con estilos en línea mínimos.
// Los hex repiten los tokens `tinta` y `papel` de src/styles/globals.css.
export default function GlobalError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <html lang="es-AR">
      <body style={{ margin: 0, minHeight: "100vh", display: "grid", placeItems: "center", fontFamily: "sans-serif", background: "#ffffff", color: "#0b0b0b" }}>
        <main style={{ padding: "1.5rem", maxWidth: "36rem" }}>
          <title>Algo salió mal</title>
          <h1>Algo salió mal</h1>
          <p>Probá de nuevo. Si sigue pasando, volvé en unos minutos.</p>
          <button type="button" onClick={() => retry()} style={{ padding: "0.75rem 1.25rem", font: "inherit", fontWeight: 700 }}>
            Probar de nuevo
          </button>
        </main>
      </body>
    </html>
  );
}
