<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Savepoint — engineering rules (Next.js 16.4, pinned)

- Version-matched docs live in `node_modules/next/dist/docs/` (resolved from repo root). Read the relevant guide before writing code; heed deprecation notices. Do not improvise API signatures.
- Architecture follows the `nextjs-app-architecture` skill (feature-sliced RSC, next-beats shape):
  - `app/**/page.tsx` and `layout.tsx` are synchronous composition surfaces: static chrome, headings, `<Suspense>`, error boundaries. Pages never fetch; feature components own reads.
  - Pages stay synchronous via `params.then()` / `searchParams.then()`. Feature components receive plain `id` / `slug` / parsed filters, never raw `params` / `searchParams`.
  - Page owns `<Suspense>`; feature owns `*Skeleton` exported from the same file, defined at the end.
  - Queries live in `features/<domain>/<domain>-queries.ts` (`import 'server-only'`); actions in `features/<domain>/<domain>-actions.ts` (`'use server'`). Filename prefix matches the folder (`games-queries.ts` in `features/games/`).
  - One folder per real domain noun. `search` folds into `games`; `releases` folds into `games` (`getUpcomingGames`) until real divergence justifies promotion. No `favorite/like/vote/bookmark/search` folders.
  - `'use client'` only on interactive leaves, never on parents of server content. Client leaves import actions directly, never via props.
  - `cacheComponents: true` + `partialPrefetching: true` are on: reusable reads use `'use cache'` + `cacheTag` + `cacheLife`; dynamic reads must be justified; mutations use `updateTag()` (actions) / `revalidateTag(..., 'max')` (route handlers), never `refresh()` as a substitute for tag invalidation.
- Domain rules: React components never call the external game API; provider types never leak into UI; editorial content is provider-independent; external data is runtime-validated before entering the domain; cache policy lives at the data-access boundary; no global client store for read-only catalog data; no database/queue without demonstrated need.
- Live provider: IGDB via server-only `lib/igdb/` (Twitch OAuth, Apicalypse queries). Keys live in `.env.local` as `TWITCH_CLIENT_ID` / `TWITCH_CLIENT_SECRET` (see `.env.example`); never invent dates/platforms/ratings when the provider omits them. Confirm IGDB's current terms before commercial use.
- Code rules: strict TypeScript, no `any`, no broad assertions, no silent catch, no invented dates/platforms/ratings. Prefer pure functions for transforms/filtering/ranking. Keep modules focused; split when hard to understand. Path alias `@/*` maps to repo root (`@/features/...`). Features live at repo root (`features/`, `content/`, `lib/`), not under `src/` — the blueprint's `src/` prefix is adapted to this repo's existing `app/` root.
- MVP is read-only: no `*-actions.ts` until a real mutation exists. When one appears, it re-checks auth, validates input, invalidates matching tags, returns a discriminated union.
