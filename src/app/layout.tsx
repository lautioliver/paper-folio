import type { Metadata } from "next";
import { Space_Grotesk } from "next/font/google";
import { siteConfig } from "@/lib/site";
import "@/styles/globals.css";

// Fuente provisoria (issue #7): la define el manual de marca.
const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
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
      className={`${spaceGrotesk.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col font-sans">{children}</body>
    </html>
  );
}
