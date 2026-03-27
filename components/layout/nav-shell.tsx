"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/dashboard", label: "Dashboard", note: "overview" },
  { href: "/requirements", label: "Requirements", note: "core records" },
  { href: "/workbench", label: "Workbench", note: "data entry" },
  { href: "/traceability", label: "Traceability", note: "network" },
  { href: "/verification", label: "Verification", note: "evidence" },
  { href: "/documents", label: "Documents", note: "sources" },
  { href: "/decisions", label: "Decisions", note: "rationale" },
  { href: "/baselines", label: "Baselines", note: "configuration" },
  { href: "/schedule", label: "Schedule", note: "programme" },
  { href: "/graph", label: "Schema Graph", note: "metadata" }
] as const;

export function NavShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <p className="eyebrow">Requirement Management System</p>
          <h1>RMS</h1>
          <p>Traceability-first web workspace rebuilt from the authoritative schema package.</p>
        </div>

        <nav className="nav-group">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className={`nav-link${pathname === link.href ? " active" : ""}`}>
              <span>{link.label}</span>
              <small>{link.note}</small>
            </Link>
          ))}
        </nav>

        <div className="side-card">
          <p className="eyebrow">Shared Store</p>
          <strong>DivvySync rms-data.json</strong>
          <p className="muted">The UI reads metadata from the schema package and operational data from the shared file.</p>
        </div>
      </aside>

      <main className="content">{children}</main>
    </div>
  );
}
