import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: {
    default: 'Savepoint — Editorial game discovery',
    template: '%s — Savepoint',
  },
  description:
    'Savepoint is a premium editorial guide to games: curated features, a searchable catalog, collections, and upcoming releases.',
};

export default function NotFound() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-start gap-4 px-4 py-16 sm:px-6">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Not found</p>
      <h1 className="text-3xl font-semibold tracking-tight">This page is off the map.</h1>
      <p className="max-w-md text-zinc-600 dark:text-zinc-400">
        The game or collection you’re looking for doesn’t exist, or its slug changed.
      </p>
      <Link
        href="/"
        className="mt-2 inline-flex h-11 items-center rounded-full bg-zinc-950 px-6 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
      >
        Back to Savepoint
      </Link>
    </div>
  );
}
