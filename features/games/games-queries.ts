import 'server-only';

import { cacheLife, cacheTag } from 'next/cache';
import { notFound } from 'next/navigation';

import { ProviderError } from '@/lib/igdb/igdb-errors';

import {
  GAMES_CATALOG_TAG,
  GAMES_SEARCH_TAG,
  GAMES_UPCOMING_TAG,
  gameTag,
  upcomingTag,
} from './games-cache';
import { normalizeSearchParams, type RelatedGame } from './games-logic';
import {
  FEATURED_GAME_SLUG,
  getFeaturedFromProvider,
  getGameFromProviderBySlug,
  getRelatedFromProvider,
  getUpcomingFromProvider,
  listCatalogPreview,
  searchProvider,
} from './games-repository';
import type { Game, GameSearchResult } from './types/game';

/**
 * Cached server reads for the games domain.
 * Cache policy lives here at the data-access boundary:
 * - catalog / profile / related / upcoming: `hours` (change infrequently)
 * - search: `minutes` (queries change; input is capped and allowlisted
 *   before it reaches the provider)
 *
 * Provider failures are never cached as valid data: a throw inside
 * `'use cache'` produces no cache entry. Unknown slugs become `notFound()`.
 */

function asNotFound(error: unknown): never {
  if (error instanceof ProviderError && error.kind === 'not-found') notFound();
  throw error;
}

export async function getFeaturedGame(): Promise<Game> {
  'use cache';
  cacheLife('hours');
  cacheTag(GAMES_CATALOG_TAG, gameTag(FEATURED_GAME_SLUG));

  try {
    return await getFeaturedFromProvider();
  } catch (error) {
    asNotFound(error);
  }
}

export async function getCatalogPreview(limit = 4): Promise<Game[]> {
  'use cache';
  cacheLife('hours');
  cacheTag(GAMES_CATALOG_TAG);

  return listCatalogPreview(limit);
}

export async function getGameBySlug(slug: string): Promise<Game> {
  'use cache';
  cacheLife('hours');
  cacheTag(GAMES_CATALOG_TAG, gameTag(slug));

  try {
    return await getGameFromProviderBySlug(slug);
  } catch (error) {
    asNotFound(error);
  }
}

export async function searchGames(input: {
  query?: unknown;
  genre?: unknown;
  platform?: unknown;
  sort?: unknown;
  page?: unknown;
  pageSize?: unknown;
}): Promise<GameSearchResult> {
  'use cache';
  cacheLife('minutes');
  cacheTag(GAMES_SEARCH_TAG);

  return searchProvider(normalizeSearchParams(input));
}

export async function getUpcomingGames(input: {
  platform?: unknown;
  limit?: number;
}): Promise<Game[]> {
  'use cache';
  cacheLife('hours');
  const platform = typeof input.platform === 'string' ? input.platform : null;
  cacheTag(GAMES_UPCOMING_TAG, upcomingTag(platform));

  return getUpcomingFromProvider({ platform, limit: input.limit });
}

export async function getRelatedGames(gameId: string, limit = 4): Promise<RelatedGame[]> {
  'use cache';
  cacheLife('hours');
  cacheTag(GAMES_CATALOG_TAG);

  return getRelatedFromProvider(gameId, limit);
}
