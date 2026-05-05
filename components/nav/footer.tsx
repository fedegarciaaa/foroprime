import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-border bg-background/60 py-8">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 text-sm text-muted-foreground sm:flex-row">
        <p>© {new Date().getFullYear()} ForoPrime</p>
        <nav className="flex items-center gap-4" aria-label="Enlaces de pie">
          <Link href="/" className="hover:text-foreground">Inicio</Link>
          <Link href="/buscar" className="hover:text-foreground">Buscar</Link>
        </nav>
      </div>
    </footer>
  );
}
