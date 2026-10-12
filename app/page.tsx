import { Suspense } from 'react';

import { SectionErrorBoundary } from '@/components/ui/error-boundary';
import { CatalogPreview, GameGridSkeleton } from '@/features/games/components/game-card';
import { FeaturedGame, FeaturedGameSkeleton } from '@/features/games/components/featured-game';

export default function Home() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-12 px-4 py-10 sm:px-6">
      <section aria-labelledby="featured-heading">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
          Savepoint — editorial game discovery
        </p>
        <h1 id="featured-heading" className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
          One game worth your evening, chosen by a human.
        </h1>
        <div className="mt-6">
          <SectionErrorBoundary title="Featured game didn't load">
            <Suspense fallback={<FeaturedGameSkeleton />}>
              <FeaturedGame />
            </Suspense>
          </SectionErrorBoundary>
        </div>
      </section>

      <section aria-labelledby="catalog-heading">
        <h2 id="catalog-heading" className="text-xl font-semibold tracking-tight">
          From the catalog
        </h2>
        <div className="mt-4">
          <SectionErrorBoundary title="Catalog preview didn't load">
            <Suspense fallback={<GameGridSkeleton count={4} />}>
              <CatalogPreview limit={4} />
            </Suspense>
          </SectionErrorBoundary>
        </div>
      </section>
    </div>
  );
}
