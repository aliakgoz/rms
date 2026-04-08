"use client";

import { usePathname } from "next/navigation";

import { NavShell } from "@/components/layout/nav-shell";
import { RmsProvider } from "@/lib/rms/provider";
import { TaskProvider } from "@/lib/tasks/provider";

function normalizeRoute(pathname: string) {
  return pathname
    .replace(/\\/g, "/")
    .replace(/\/index\.html$/i, "")
    .replace(/\/$/, "");
}

function isTaskRoute(pathname: string) {
  const normalized = normalizeRoute(pathname);
  const withoutHtml = normalized.replace(/\.html$/i, "");

  return (
    withoutHtml === "/tasks" ||
    withoutHtml.endsWith("/tasks") ||
    normalized.endsWith("/tasks.html")
  );
}

function getActiveRoute(pathname: string) {
  const normalized = pathname
    .replace(/\\/g, "/")
    .replace(/\/index\.html$/i, "")
    .replace(/\.html$/i, "")
    .replace(/\/$/, "");

  return normalized.length === 0 ? "/" : normalized;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const locationPath =
    typeof window === "undefined" ? pathname : window.location.pathname || pathname;
  const activeRoute = getActiveRoute(pathname);
  const standaloneTasks = isTaskRoute(pathname) || isTaskRoute(locationPath);

  if (standaloneTasks || activeRoute === "/tasks") {
    return (
      <TaskProvider>
        <main className="content content-standalone">{children}</main>
      </TaskProvider>
    );
  }

  return (
    <RmsProvider>
      <TaskProvider>
        <NavShell>{children}</NavShell>
      </TaskProvider>
    </RmsProvider>
  );
}
