import type { Metadata } from "next";
import { Onest } from "next/font/google";
import { siteConfig } from "@/lib/site";
import "@/styles/globals.css";

// Onest: la fuente del diseño, identificada en el manual de marca (#18).
const onest = Onest({
  variable: "--font-onest",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: siteConfig.name,
  description: siteConfig.description,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es-AR"
      className={`${onest.variable} h-full scroll-pt-24 antialiased`}
    >
      <body className="flex min-h-full flex-col font-sans">{children}</body>
    </html>
  );
}
