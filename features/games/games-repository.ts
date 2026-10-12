import {
  fetchIgdbGenres,
  fetchIgdbPlatforms,
  IGDB_DETAIL_FIELDS,
  IGDB_LIST_FIELDS,
  queryIgdbGameDetail,
  queryIgdbGames,
} from '@/lib/igdb/igdb-client';
import { ProviderError } from '@/lib/igdb/igdb-errors';

import { toDomainGame, toDomainGameDetail } from './games-mapper';
import { clampLimit, rankRelatedGames, type RelatedGame } from './games-logic';
import { isValidGameSlug } from './games-schema';
import type { Game, GameSearchParams, GameSearchResult } from './types/game';

/**
 * Live data-access for games. Queries IGDB with Apicalypse, maps to the
 * Savepoint domain, and returns domain types. No cache directives here —
 * `games-queries.ts` owns the cache policy. Failures propagate as
 * `ProviderError` and are never cached as valid data.
 *
 * IGDB notes (verify against live responses if behavior looks off):
 * - Filtering by genre/platform needs numeric IDs, so URL slugs resolve
 *   through memoized id maps; unknown slugs return empty, never a request.
 * - IGDB lists carry no total count, so search reports `hasMore` instead.
 */

export const FEATURED_GAME_SLUG = 'elden-ring';

const SLUG_TO_ID_TTL_MS = 60 * 60 * 1000;

let genreMapCache: { at: number; map: Map<string, number> } | null = null;
let platformMapCache: { at: number; map: Map<string, number> } | null = null;

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

function dateToUnix(date: string): number {
  return Math.floor(Date.parse(`${date}T00:00:00Z`) / 1000);
}

function oneYearLater(today: string): string {
  const [year, month, day] = today.split('-').map(Number);
  return `${year + 1}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** Strips Apicalypse metacharacters so user input can't break out of `search "..."`. */
function sanitizeSearch(query: string): string {
  return query.replace(/[";\\]/g, '').trim();
}

async function idMapFor(kind: 'genre' | 'platform'): Promise<Map<string, number>> {
  const cached = kind === 'genre' ? genreMapCache : platformMapCache;
  if (cached && Date.now() - cached.at < SLUG_TO_ID_TTL_MS) return cached.map;
  const entries = kind === 'genre' ? await fetchIgdbGenres() : await fetchIgdbPlatforms();
  const map = new Map(entries.map((entry) => [entry.slug, entry.id]));
  const fresh = { at: Date.now(), map };
  if (kind === 'genre') genreMapCache = fresh;
  else platformMapCache = fresh;
  return map;
}

function toDomainList(
  items: Parameters<typeof toDomainGame>[0][],
  today: string,
): Game[] {
  const games: Game[] = [];
  // Skip entries that fail domain validation instead of failing the whole
  // page: one malformed provider record must not take down a listing.
  for (const item of items) {
    try {
      games.push(toDomainGame(item, today));
    } catch {
      continue;
    }
  }
  return games;
}

function emptySearch(params: GameSearchParams): GameSearchResult {
  return { results: [], page: params.page, pageSize: params.pageSize, hasMore: false };
}

export async function getFeaturedFromProvider(): Promise<Game> {
  const raw = await queryIgdbGameDetail(
    `fields ${IGDB_DETAIL_FIELDS}; where slug = "${FEATURED_GAME_SLUG}"; limit 1;`,
  );
  if (!raw) throw new ProviderError('not-found', 'IGDB has no featured game for this slug.');
  return toDomainGameDetail(raw, todayUtc());
}

export async function listCatalogPreview(limit: number): Promise<Game[]> {
  const items = await queryIgdbGames(
    `fields ${IGDB_LIST_FIELDS}; sort total_rating_count desc; limit ${clampLimit(limit, 4)};`,
  );
  return toDomainList(items, todayUtc());
}

export async function getGameFromProviderBySlug(slug: string): Promise<Game> {
  if (!isValidGameSlug(slug)) {
    throw new ProviderError('not-found', 'Invalid game slug.');
  }
  const raw = await queryIgdbGameDetail(
    `fields ${IGDB_DETAIL_FIELDS}; where slug = "${slug}"; limit 1;`,
  );
  if (!raw) throw new ProviderError('not-found', `IGDB has no game for slug "${slug}".`);
  return toDomainGameDetail(raw, todayUtc());
}

export async function getGameFromProviderById(id: string): Promise<Game> {
  if (!/^\d+$/.test(id)) throw new ProviderError('not-found', 'Invalid game id.');
  const raw = await queryIgdbGameDetail(
    `fields ${IGDB_DETAIL_FIELDS}; where id = ${id}; limit 1;`,
  );
  if (!raw) throw new ProviderError('not-found', `IGDB has no game for id "${id}".`);
  return toDomainGameDetail(raw, todayUtc());
}

export async function searchProvider(params: GameSearchParams): Promise<GameSearchResult> {
  const clauses: string[] = [];
  if (params.genre !== null) {
    const id = (await idMapFor('genre')).get(params.genre);
    if (id === undefined) return emptySearch(params);
    clauses.push(`genres = (${id})`);
  }
  if (params.platform !== null) {
    const id = (await idMapFor('platform')).get(params.platform);
    if (id === undefined) return emptySearch(params);
    clauses.push(`platforms = (${id})`);
  }

  const query = sanitizeSearch(params.query);
  // One extra row detects a next page; IGDB reports no total count.
  const probeSize = params.pageSize + 1;
  const sort =
    params.sort === 'release-date'
      ? 'sort first_release_date desc;'
      : params.sort === 'title'
        ? 'sort name asc;'
        : '';
  const items = await queryIgdbGames(
    `fields ${IGDB_LIST_FIELDS};` +
      (query.length > 0 ? `search "${query}";` : '') +
      (clauses.length > 0 ? `where ${clauses.join(' & ')};` : '') +
      sort +
      `limit ${probeSize}; offset ${(params.page - 1) * params.pageSize};`,
  );
  const today = todayUtc();
  return {
    results: toDomainList(items.slice(0, params.pageSize), today),
    page: params.page,
    pageSize: params.pageSize,
    hasMore: items.length > params.pageSize,
  };
}

export async function getUpcomingFromProvider(options: {
  platform?: string | null;
  limit?: number;
}): Promise<Game[]> {
  const today = todayUtc();
  const platform = options.platform ?? null;
  const clauses = [
    `first_release_date > ${dateToUnix(today)}`,
    `first_release_date < ${dateToUnix(oneYearLater(today))}`,
  ];
  if (platform !== null) {
    if (!isValidGameSlug(platform)) return [];
    const id = (await idMapFor('platform')).get(platform);
    if (id === undefined) return [];
    clauses.push(`platforms = (${id})`);
  }
  const items = await queryIgdbGames(
    `fields ${IGDB_LIST_FIELDS}; where ${clauses.join(' & ')}; sort first_release_date asc; limit ${clampLimit(options.limit, 6)};`,
  );
  return toDomainList(items, today);
}

export async function getRelatedFromProvider(
  sourceId: string,
  limit = 4,
): Promise<RelatedGame[]> {
  const source = await getGameFromProviderById(sourceId);
  // Stored genre ids are IGDB ids, so no slug round-trip is needed.
  const genreId = source.genres[0]?.id ?? null;
  if (genreId === null) return [];
  const items = await queryIgdbGames(
    `fields ${IGDB_LIST_FIELDS}; where genres = (${genreId}) & id != (${sourceId}); limit 10;`,
  );
  return rankRelatedGames(source, toDomainList(items, todayUtc()), limit);
}
