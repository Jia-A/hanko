"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import ThemeToggle from "./ThemeToggle";
import Logo from "./Logo";

const LINKS = [
  { href: "/", label: "Studio" },
  { href: "/pdf-tool", label: "PDF Stamp" },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
      <nav className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3 sm:px-5">
        <Link href="/" className="group flex shrink-0 items-center gap-2">
          <Logo className="h-7 w-7" />
          <span className="mono text-sm font-semibold tracking-tight">
            hanko<span className="text-accent">.</span>
          </span>
        </Link>

        <div className="flex items-center gap-3 sm:gap-4">
          {LINKS.map((link, i) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`eyebrow link-underline whitespace-nowrap transition-colors ${
                  active ? "text-accent" : "text-muted hover:text-foreground"
                }`}
              >
                <span className="hidden opacity-50 sm:inline">0{i + 1} </span>
                {link.label}
              </Link>
            );
          })}
          <div className="ml-1 shrink-0">
            <ThemeToggle />
          </div>
        </div>
      </nav>
    </header>
  );
}
