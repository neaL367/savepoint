import { ProviderError } from '@/lib/igdb/igdb-errors';
import type { IgdbGameDetail, IgdbGameListItem } from '@/lib/igdb/igdb-schema';

import { isValidGameSlug, parseGame } from './games-schema';
import type { Game, GameGenre, GamePlatform, GameRelease, GameStudio } from './types/game';

/**
 * IGDB → Savepoint domain mapping. Pure: every function takes an explicit
 * `today` (YYYY-MM-DD) so status derivation stays testable.
 *
 * Honesty rules:
 * - Release precision is derived from IGDB's `human`/`m` fields, never
 *   assumed: missing month → year, quarter → year, month + year → month.
 * - Platforms without a dated release are omitted, never backfilled.
 * - IGDB exposes no `delayed` signal Savepoint trusts, so mapped releases
 *   are only `announced` or `released`.
 * - IGDB artwork URLs are host-allowlisted to `images.igdb.com`.
 * - `mechanics` stays empty until editorial curation provides it.
 * - Every mapped game passes through `parseGame` as a final gate.
 */

const IGDB_IMAGE_HOST = 'https://images.igdb.com/';

function igdbImageUrl(url: unknown, size: 't_cover_big' | 't_screenshot_big'): string | null {
  if (typeof url !== 'string' || url.length === 0) return null;
  const absolute = url.startsWith('//') ? `https:${url}` : url;
  if (!absolute.startsWith(IGDB_IMAGE_HOST)) return null;
  return absolute.replace(/\/t_[a-z0-9_]+(?=\/)/, `/${size}`);
}

function toNamedList<T extends { id: number; name: string; slug: string }>(
  entries: ({ id: number; name: string; slug: string } | number)[] | undefined,
): T[] {
  if (!entries) return [];
  const out: T[] = [];
  for (const entry of entries) {
    if (typeof entry === 'number') continue;
    if (typeof entry.id !== 'number' || typeof entry.name !== 'string' || entry.name.length === 0) {
      continue;
    }
    if (!isValidGameSlug(entry.slug)) continue;
    out.push({ id: entry.id, name: entry.name, slug: entry.slug } as T);
  }
  return out;
}

function unixToDate(timestamp: number): string | null {
  if (!Number.isInteger(timestamp) || timestamp <= 0) return null;
  const date = new Date(timestamp * 1000).toISOString().slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null;
}

function precisionFor(human: string | null | undefined, month: number | null | undefined): GameRelease['precision'] {
  if (month === null || month === undefined) return 'year';
  if (typeof human === 'string') {
    if (/^\d{4}$/.test(human.trim())) return 'year';
    if (/^Q[1-4]/i.test(human.trim())) return 'year';
    if (/^[A-Za-z]+\s+\d{4}$/.test(human.trim())) return 'month';
  }
  return 'day';
}

function toReleases(
  releaseDates:
    | {
        date?: number | null;
        human?: string | null;
        m?: number | null;
        platform?: { id: number; name: string; slug: string } | number | null;
      }[]
    | undefined,
  firstReleaseDate: number | null | undefined,
  today: string,
): GameRelease[] {
  const releases: GameRelease[] = [];
  for (const entry of releaseDates ?? []) {
    const date = typeof entry.date === 'number' ? unixToDate(entry.date) : null;
    if (date === null) continue;
    const platformId =
      typeof entry.platform === 'number'
        ? entry.platform
        : entry.platform?.id ?? null;
    releases.push({
      platformId,
      date,
      precision: precisionFor(entry.human, entry.m),
      status: date > today ? 'announced' : 'released',
    });
  }
  if (releases.length === 0 && typeof firstReleaseDate === 'number') {
    const date = unixToDate(firstReleaseDate);
    if (date !== null) {
      releases.push({
        platformId: null,
        date,
        precision: 'day',
        status: date > today ? 'announced' : 'released',
      });
    }
  }
  return releases;
}

function toStudios(
  involved: IgdbGameDetail['involved_companies'],
  role: 'developer' | 'publisher',
): GameStudio[] {
  const studios: GameStudio[] = [];
  for (const entry of involved ?? []) {
    if (entry[role] !== true) continue;
    if (typeof entry.company === 'number') continue;
    if (!isValidGameSlug(entry.company.slug) || entry.company.name.length === 0) continue;
    studios.push({ id: entry.company.id, name: entry.company.name, slug: entry.company.slug });
  }
  return studios;
}

function gate(candidate: Omit<Game, 'id'> & { id: string }, context: string): Game {
  const parsed = parseGame(candidate);
  if (!parsed) {
    throw new ProviderError('malformed', `IGDB entry failed domain validation (${context}).`);
  }
  return parsed;
}

function coverOf(cover: IgdbGameListItem['cover']): string | null {
  if (!cover || typeof cover === 'number') return null;
  return igdbImageUrl(cover.url, 't_cover_big');
}

export function toDomainGame(item: IgdbGameListItem, today: string): Game {
  const summary = typeof item.summary === 'string' && item.summary.length > 0 ? item.summary : null;
  return gate(
    {
      id: String(item.id),
      slug: item.slug,
      title: item.name,
      summary,
      coverImage: coverOf(item.cover),
      screenshots: [],
      genres: toNamedList<GameGenre>(item.genres),
      platforms: toNamedList<GamePlatform>(item.platforms),
      developers: [],
      publishers: [],
      releases: toReleases(item.release_dates, item.first_release_date, today),
      mechanics: [],
      source: {
        provider: 'igdb',
        externalId: String(item.id),
        updatedAt:
          typeof item.updated_at === 'number'
            ? (unixToDate(item.updated_at) ?? null)
            : null,
      },
    },
    `slug: ${item.slug}`,
  );
}

export function toDomainGameDetail(detail: IgdbGameDetail, today: string): Game {
  const summary =
    typeof detail.summary === 'string' && detail.summary.length > 0 ? detail.summary : null;
  const screenshots: string[] = [];
  for (const shot of detail.screenshots ?? []) {
    if (typeof shot === 'number') continue;
    const url = igdbImageUrl(shot.url, 't_screenshot_big');
    if (url !== null) screenshots.push(url);
  }
  return gate(
    {
      id: String(detail.id),
      slug: detail.slug,
      title: detail.name,
      summary,
      coverImage: coverOf(detail.cover),
      screenshots,
      genres: toNamedList<GameGenre>(detail.genres),
      platforms: toNamedList<GamePlatform>(detail.platforms),
      developers: toStudios(detail.involved_companies, 'developer'),
      publishers: toStudios(detail.involved_companies, 'publisher'),
      releases: toReleases(detail.release_dates, detail.first_release_date, today),
      mechanics: [],
      source: {
        provider: 'igdb',
        externalId: String(detail.id),
        updatedAt:
          typeof detail.updated_at === 'number'
            ? (unixToDate(detail.updated_at) ?? null)
            : null,
      },
    },
    `slug: ${detail.slug}`,
  );
}
