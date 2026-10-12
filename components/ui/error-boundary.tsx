'use client';

import { catchError, type ErrorInfo } from 'next/error';
import type { ReactNode } from 'react';

type SectionErrorProps = {
  title: string;
};

function SectionErrorFallback({ title }: SectionErrorProps, { retry }: ErrorInfo): ReactNode {
  return (
    <div role="alert" className="rounded-xl border border-red-900/40 bg-red-950/20 p-6">
      <p className="text-sm font-medium text-red-200">{title}</p>
      <button
        type="button"
        onClick={retry}
        className="mt-3 rounded-full border border-red-200/30 px-4 py-1.5 text-sm text-red-100 transition-colors hover:bg-red-900/30"
      >
        Try again
      </button>
    </div>
  );
}

/**
 * Section-level error boundary for page Suspense sections.
 * Built on `catchError` so framework throws (`notFound()`, `redirect()`)
 * keep working and `retry()` re-fetches server data.
 */
export const SectionErrorBoundary = catchError(SectionErrorFallback);
