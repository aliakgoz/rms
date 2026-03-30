import type { Metadata } from "next";
import "./globals.css";
import { NavShell } from "@/components/layout/nav-shell";
import { RmsProvider } from "@/lib/rms/provider";

export const metadata: Metadata = {
  title: "RMS Web",
  description: "Requirement Management System for radioactive waste management"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body>
        <RmsProvider>
          <NavShell>{children}</NavShell>
        </RmsProvider>
      </body>
    </html>
  );
}
