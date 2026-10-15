import type { DefaultSession } from "next-auth";
import type { Rol } from "@/models/Usuario";

// La sesión y el token de Auth.js llevan el id del usuario en `usuarios` y su rol (src/auth.ts).
declare module "next-auth" {
  interface Session {
    user: { id: string; rol: Rol } & DefaultSession["user"];
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id?: string;
    rol?: Rol;
  }
}
