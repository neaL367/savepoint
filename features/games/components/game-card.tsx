import Image from 'next/image';
import Link from 'next/link';

import { getCatalogPreview } from '../games-queries';
import { formatReleaseDate, getDisplayRelease } from '../games-logic';
import type { Game } from '../types/game';

function ReleaseLine({ game }: { game: Game }) {
  const display = getDisplayRelease(game);
  const platformNames = game.platforms.map((platform) => platform.name).join(' · ');
  return (
    <p className="text-sm text-zinc-500 dark:text-zinc-400">
      {formatReleaseDate(display)}
      {platformNames.length > 0 ? ` — ${platformNames}` : null}
    </p>
  );
}

export function GameCard({ game }: { game: Game }) {
  return (
    <Link
      href={`/games/${game.slug}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white transition-colors hover:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-600"
    >
      {game.coverImage !== null ? (
        <span className="relative block aspect-[16/9] w-full overflow-hidden bg-zinc-100 dark:bg-zinc-900">
          <Image
            src={game.coverImage}
            alt=""
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          />
        </span>
      ) : (
        <span
          aria-hidden
          className="flex aspect-[16/9] w-full items-center justify-center bg-zinc-100 dark:bg-zinc-900"
        >
          <span className="text-3xl font-semibold text-zinc-300 dark:text-zinc-700">
            {game.title.charAt(0)}
          </span>
        </span>
      )}
      <span className="flex flex-1 flex-col gap-1 p-4">
        <span className="font-medium text-zinc-950 group-hover:underline dark:text-zinc-50">
          {game.title}
        </span>
        <ReleaseLine game={game} />
      </span>
    </Link>
  );
}

export function GameGrid({ games }: { games: Game[] }) {
  return (
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {games.map((game) => (
        <li key={game.id}>
          <GameCard game={game} />
        </li>
      ))}
    </ul>
  );
}

/** Owns the catalog-preview read; the page owns the Suspense boundary. */
export async function CatalogPreview({ limit }: { limit: number }) {
  const games = await getCatalogPreview(limit);
  return <GameGrid games={games} />;
}

export function GameGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-hidden>
      {Array.from({ length: count }).map((_, index) => (
        <li
          key={index}
          className="flex flex-col overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800"
        >
          <span className="aspect-[16/9] w-full animate-pulse bg-zinc-100 dark:bg-zinc-900" />
          <span className="flex flex-col gap-2 p-4">
            <span className="h-5 w-3/4 animate-pulse rounded bg-zinc-100 dark:bg-zinc-900" />
            <span className="h-4 w-1/2 animate-pulse rounded bg-zinc-100 dark:bg-zinc-900" />
          </span>
        </li>
      ))}
    </ul>
  );
}
