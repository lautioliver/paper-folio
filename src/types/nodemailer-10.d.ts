// nodemailer se instala con el alias `nodemailer-10` (npm:nodemailer@^10): con `nodemailer` en el primer
// nivel, npm anida @auth/core (su peer opcional pide nodemailer ^7 || ^8) y se rompe la augmentación de
// `@auth/core/jwt` (src/types/next-auth.d.ts). Aprobado por @lautioliver en #40. Los tipos son los de
// @types/nodemailer (la API que usamos, `createTransport` y `sendMail`, no cambió entre la 8 y la 10).
declare module "nodemailer-10" {
  export * from "nodemailer";
  export { default } from "nodemailer";
}
