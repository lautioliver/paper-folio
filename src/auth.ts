import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { permiteIngreso } from "@/lib/acceso";
import { leerAuthConfig } from "@/lib/env";
import { registrarIngreso, usuarioBloqueado } from "@/lib/usuarios";

/**
 * Auth.js v5 con Google y sesión JWT, sin adaptador de base (ADR-002).
 * Al ingresar, el usuario se crea o actualiza en `usuarios` (`registrarIngreso`); el token lleva `id` y
 * `rol`. Para permisos, el rol se relee de la base (`src/lib/permisos.ts`). Una cuenta bloqueada (#49) no ingresa.
 * La configuración es perezosa: las variables se validan al primer uso, no al importar (así `next build`
 * no las exige).
 */
export const { handlers, auth, signIn, signOut } = NextAuth(() => {
  const { AUTH_SECRET, AUTH_GOOGLE_ID, AUTH_GOOGLE_SECRET } = leerAuthConfig();
  return {
    secret: AUTH_SECRET,
    providers: [Google({ clientId: AUTH_GOOGLE_ID, clientSecret: AUTH_GOOGLE_SECRET })],
    session: { strategy: "jwt" },
    // Los errores de Auth.js (por ejemplo AccessDenied, cuando `signIn` da false) van a /ingresar, en español,
    // en vez de su página genérica.
    pages: { error: "/ingresar" },
    callbacks: {
      // Solo cuentas de Google con el email verificado y sin bloquear (#49). Si la base no responde, el
      // ingreso falla (cerrado): Auth.js muestra su error.
      async signIn({ account, profile }) {
        try {
          return await permiteIngreso(
            { proveedor: account?.provider, emailVerificado: profile?.email_verified, email: profile?.email },
            usuarioBloqueado,
          );
        } catch (error) {
          console.error("auth: no se pudo comprobar el bloqueo", error instanceof Error ? error.name : "desconocido");
          throw error;
        }
      },
      async jwt({ token, user, account }) {
        // `account` solo viene en el ingreso: ahí se registra el usuario y se fija su rol en el token.
        if (account && user?.email) {
          try {
            const ingresado = await registrarIngreso({ email: user.email, nombre: user.name, imagen: user.image });
            token.id = ingresado.id;
            token.rol = ingresado.rol;
          } catch (error) {
            // Solo el nombre: el mensaje puede traer la URI de la base. El ingreso falla y Auth.js muestra su error.
            console.error("auth: no se pudo registrar el ingreso", error instanceof Error ? error.name : "desconocido");
            throw error;
          }
        }
        return token;
      },
      session({ session, token }) {
        if (session.user) {
          session.user.id = typeof token.id === "string" ? token.id : "";
          session.user.rol = token.rol ?? "usuario";
        }
        return session;
      },
    },
  };
});
