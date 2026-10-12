import Link from 'next/link';

import { getFeaturedGame } from '../games-queries';
import { formatReleaseDate, getDisplayRelease } from '../games-logic';

/** Curated featured game; the page owns the Suspense boundary. */
export async function FeaturedGame() {
  const game = await getFeaturedGame();
  const display = getDisplayRelease(game);

  return (
    <article className="flex min-h-[320px] flex-col justify-end overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-950 p-8 text-white sm:p-12 dark:border-zinc-800">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
        Featured
      </p>
      <h2 className="mt-3 max-w-xl text-3xl font-semibold leading-tight tracking-tight sm:text-5xl">
        {game.title}
      </h2>
      {game.summary !== null ? (
        <p className="mt-4 max-w-xl text-base leading-7 text-zinc-300">{game.summary}</p>
      ) : null}
      <p className="mt-4 text-sm text-zinc-400">
        {formatReleaseDate(display)}
        {game.developers.length > 0 ? ` — ${game.developers[0].name}` : null}
      </p>
      <p className="mt-6">
        <Link
          href={`/games/${game.slug}`}
          className="inline-flex h-11 items-center rounded-full bg-white px-6 text-sm font-medium text-zinc-950 transition-colors hover:bg-zinc-200"
        >
          View game
        </Link>
      </p>
    </article>
  );
}

export function FeaturedGameSkeleton() {
  return (
    <div
      aria-hidden
      className="flex min-h-[320px] flex-col justify-end rounded-2xl border border-zinc-200 p-8 sm:p-12 dark:border-zinc-800"
    >
      <span className="h-4 w-24 animate-pulse rounded bg-zinc-100 dark:bg-zinc-900" />
      <span className="mt-3 h-10 w-2/3 animate-pulse rounded bg-zinc-100 sm:h-14 dark:bg-zinc-900" />
      <span className="mt-4 h-5 w-1/2 animate-pulse rounded bg-zinc-100 dark:bg-zinc-900" />
      <span className="mt-6 h-11 w-32 animate-pulse rounded-full bg-zinc-100 dark:bg-zinc-900" />
    </div>
  );
}
