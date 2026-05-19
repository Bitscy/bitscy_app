import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-background text-text">
      <div className="mx-auto max-w-2xl px-4 py-12">
        <h1 className="text-4xl font-bold tracking-tight">Bitscy</h1>
        <p className="mt-2 text-text-muted">The marketplace for African creative women.</p>

        <section className="mt-12 space-y-4 rounded-lg border border-primary/20 bg-surface p-6">
          <h2 className="text-xl font-semibold">For the team</h2>
          <p className="text-text-muted">
            This is the starter scaffold. Each engineer&apos;s work lives in their owned directories.
            See <code className="rounded bg-primary/10 px-1 py-0.5 text-sm">CLAUDE.md</code> at the
            root and inside each role&apos;s service directory.
          </p>
          <div className="space-y-2 text-sm">
            <p>
              <span className="font-medium">Catalog Engineer:</span>{' '}
              <code>src/services/catalog/</code> and <code>src/app/api/products/</code>
            </p>
            <p>
              <span className="font-medium">Commerce Engineer:</span>{' '}
              <code>src/services/commerce/</code> and <code>src/app/api/orders/</code>
            </p>
            <p>
              <span className="font-medium">Experience Engineer:</span> <code>src/app/</code> and{' '}
              <code>src/components/</code>
            </p>
          </div>
          <div className="pt-2">
            <Link
              href="/seller"
              className="inline-flex h-touch items-center rounded-md bg-primary px-4 text-sm font-medium text-white hover:bg-primary-600"
            >
              Test seller dashboard
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
