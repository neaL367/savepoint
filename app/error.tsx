'use client';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-start gap-4 px-4 py-16 sm:px-6">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
        Something went wrong
      </p>
      <h1 className="text-3xl font-semibold tracking-tight">This section didn’t load.</h1>
      <p className="max-w-md text-zinc-600 dark:text-zinc-400">
        {error.digest ? `Error digest: ${error.digest}` : 'An unexpected error interrupted rendering.'}
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-2 inline-flex h-11 items-center rounded-full bg-zinc-950 px-6 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
      >
        Try again
      </button>
    </div>
  );
}
