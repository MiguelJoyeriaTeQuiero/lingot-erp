export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="relative min-h-screen w-full bg-surface">
      {/* Línea dorada superior como acento de marca */}
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-[2px] bg-gold/70"
      />
      <div className="flex min-h-screen items-center justify-center px-6 py-12">
        {children}
      </div>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-8 text-center text-xs text-text-muted"
      >
        Te Quiero Group — Lingot
      </div>
    </main>
  );
}
