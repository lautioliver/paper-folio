import { z } from "zod";
import { respuestaConfiguracionInvalida, respuestaError } from "@/lib/api-error";
import { EnvInvalidoError } from "@/lib/env";
import { MENSAJES, subirImagen, TAMANO_MAXIMO } from "@/lib/imagenes";
import { requerirRolApi } from "@/lib/permisos";

// Lo que agrega el multipart alrededor del archivo (boundary y cabeceras de la parte).
const MARGEN_MULTIPART = 64 * 1024;

const esquemaArchivo = z.instanceof(File);

const demasiadoGrande = () => respuestaError(413, "IMAGEN_INVALIDA", MENSAJES.tamano, { motivo: "tamano" });

/**
 * Sube una imagen del contenido (campo `archivo` de un multipart/form-data) y responde `{ url }`.
 * Solo `admin`. Route handler y no server action: el límite de 1 MB de las server actions no alcanza
 * para 2 MB y así no hace falta tocar `next.config.ts`.
 */

export async function POST(request: Request): Promise<Response> {
  // Antes de leer el cuerpo, y en JSON (nunca un redirect): 401 SIN_SESION o 403 SIN_PERMISO.
  const permiso = await requerirRolApi("admin");
  if (!permiso.ok) return permiso.respuesta;

  // Las server actions traen su chequeo de origen; un route handler no. Un multipart se manda desde un
  // <form> de cualquier página: la cookie Lax ya frena otro sitio, esto frena además un subdominio
  // (`same-site`). Sin el encabezado (curl, otro cliente) no hay cookie de un navegador ajeno que abusar.
  const sitio = request.headers.get("sec-fetch-site");
  if (sitio === "cross-site" || sitio === "same-site") {
    return respuestaError(403, "ORIGEN_NO_PERMITIDO", "La subida tiene que hacerse desde el panel.");
  }

  if (!request.headers.get("content-type")?.toLowerCase().startsWith("multipart/form-data")) {
    return respuestaError(415, "TIPO_NO_SOPORTADO", "El envío tiene que ser multipart/form-data.");
  }
  // Corte barato antes de parsear: el tamaño real del archivo se vuelve a validar abajo.
  if (Number(request.headers.get("content-length") ?? 0) > TAMANO_MAXIMO + MARGEN_MULTIPART) {
    return demasiadoGrande();
  }

  const form = await request.formData().catch(() => null);
  const archivo = esquemaArchivo.safeParse(form?.get("archivo"));
  if (!archivo.success) {
    return respuestaError(400, "ARCHIVO_FALTANTE", "Elegí una imagen para subir.");
  }
  if (archivo.data.size > TAMANO_MAXIMO) {
    return demasiadoGrande();
  }

  try {
    // El nombre y el tipo del archivo que manda el cliente se ignoran: vale el contenido.
    const resultado = await subirImagen(new Uint8Array(await archivo.data.arrayBuffer()));
    if (!resultado.ok) {
      return respuestaError(resultado.motivo === "tamano" ? 413 : 400, "IMAGEN_INVALIDA", resultado.mensaje, {
        motivo: resultado.motivo,
      });
    }
    return Response.json({ url: resultado.url }, { status: 201 });
  } catch (e) {
    if (e instanceof EnvInvalidoError) {
      console.error("imagenes:", e.message); // nombra la variable, nunca el valor
      return respuestaConfiguracionInvalida();
    }
    // Solo el nombre del error: el mensaje puede traer credenciales.
    console.error("imagenes: no se pudo subir", e instanceof Error ? e.name : "desconocido");
    return respuestaError(503, "SUBIDA_FALLIDA", "No pudimos subir la imagen. Probá de nuevo más tarde.");
  }
}
