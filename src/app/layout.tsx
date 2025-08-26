
import "./globals.css";
import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "Tropi Coqueta Networking Party Selector",
};


export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning className="min-h-screen bg-background antialiased">
        <SiteHeader />
        <div className="mx-auto max-w-5xl">{children}</div>
      </body>
    </html>
  );
}
