"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileText, LayoutDashboard, Layers, MessageSquare, NotebookPen } from "lucide-react";

import { cn } from "@/lib/utils";

import { Logo } from "./Logo";

export const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/documents", label: "Papers", icon: FileText },
  { href: "/chat", label: "Chat", icon: MessageSquare },
  { href: "/notes", label: "Notes", icon: NotebookPen },
  { href: "/flashcards", label: "Flashcards", icon: Layers },
] as const;

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="grid gap-1">
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);

        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative flex items-center gap-3 py-2 pl-4 pr-3 text-sm transition-colors",
              active ? "font-medium text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {/* A ruled margin mark rather than a filled pill. */}
            <span
              aria-hidden="true"
              className={cn(
                "absolute inset-y-1 left-0 w-[2px] rounded-full transition-colors",
                active ? "bg-primary" : "bg-transparent",
              )}
            />
            <Icon className={cn("size-4", active ? "text-primary" : "text-muted-foreground/70")} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

export function Sidebar() {
  return (
    <aside className="hidden w-60 shrink-0 border-r border-border bg-sidebar md:flex md:flex-col">
      <div className="px-5 py-5">
        <Link href="/" aria-label="Noteworthy home">
          <Logo />
        </Link>
      </div>
      <div className="px-3">
        <SidebarNav />
      </div>
    </aside>
  );
}
