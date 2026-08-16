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
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
              active
                ? "bg-primary/15 font-medium text-foreground"
                : "text-muted-foreground hover:bg-card hover:text-foreground",
            )}
          >
            <Icon className={cn("size-4", active && "text-primary")} />
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
        <Link href="/dashboard">
          <Logo />
        </Link>
      </div>
      <div className="px-3">
        <SidebarNav />
      </div>
    </aside>
  );
}
