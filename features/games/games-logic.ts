import type { Game, GameSearchParams, GameSort } from './types/game';

/**
 * Pure domain logic for games: param normalization, release display rules,
 * and related-game ranking. No I/O, no Next.js imports — safe to unit-test
 * with fixtures and to reuse from any data source.
 */

export const MAX_QUERY_LENGTH = 100;
export const MAX_PAGE_SIZE = 24;
export const DEFAULT_PAGE_SIZE = 12;

export function normalizeSearchParams(input: {
  query?: unknown;
  genre?: unknown;
  platform?: unknown;
  sort?: unknown;
  page?: unknown;
  pageSize?: unknown;
}): GameSearchParams {
  const rawQuery = typeof input.query === 'string' ? input.query.trim() : '';
  const query = rawQuery.slice(0, MAX_QUERY_LENGTH);
  const genre = typeof input.genre === 'string' && input.genre.length > 0 ? input.genre : null;
  const platform =
    typeof input.platform === 'string' && input.platform.length > 0 ? input.platform : null;
  const sort: GameSort =
    input.sort === 'release-date' || input.sort === 'title' || input.sort === 'relevance'
      ? input.sort
      : 'relevance';
  const page =
    typeof input.page === 'number' && Number.isInteger(input.page) && input.page >= 1
      ? input.page
      : 1;
  const pageSize =
    typeof input.pageSize === 'number' &&
    Number.isInteger(input.pageSize) &&
    input.pageSize >= 1 &&
    input.pageSize <= MAX_PAGE_SIZE
      ? input.pageSize
      : DEFAULT_PAGE_SIZE;
  return { query, genre, platform, sort, page, pageSize };
}

export function clampLimit(limit: number | undefined, fallback: number): number {
  if (typeof limit !== 'number' || !Number.isInteger(limit)) return fallback;
  return Math.max(1, Math.min(limit, MAX_PAGE_SIZE));
}

export type DisplayRelease = {
  date: string;
  precision: Game['releases'][number]['precision'];
  status: Game['releases'][number]['status'];
};

/** Earliest dated release; null when the source gives no date. */
export function getDisplayRelease(game: Game): DisplayRelease | null {
  const dated: DisplayRelease[] = [];
  for (const release of game.releases) {
    if (release.date === null) continue;
    dated.push({ date: release.date, precision: release.precision, status: release.status });
  }
  if (dated.length === 0) return null;
  dated.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  return dated[0];
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/** Formats a display release, preserving the source precision. */
export function formatReleaseDate(display: DisplayRelease | null): string {
  if (display === null) return 'Release date TBA';
  const [year, month, day] = display.date.split('-').map(Number);
  if (display.precision === 'year' || Number.isNaN(month)) return `${year}`;
  if (display.precision === 'month' || Number.isNaN(day)) return `${MONTH_NAMES[month - 1]} ${year}`;
  return `${MONTH_NAMES[month - 1]} ${day}, ${year}`;
}

export type RelatedGame = {
  game: Game;
  score: number;
  reasons: string[];
};

export function explainRelation(a: Game, b: Game): string[] {
  const reasons: string[] = [];
  const sharedGenres = a.genres.filter((genre) =>
    b.genres.some((other) => other.slug === genre.slug),
  );
  if (sharedGenres.length === 1) reasons.push(`Shares ${sharedGenres[0].name}`);
  if (sharedGenres.length > 1) reasons.push(`Shares ${sharedGenres.length} genres`);
  const sharedStudios = a.developers.filter((studio) =>
    b.developers.some((other) => other.slug === studio.slug),
  );
  if (sharedStudios.length > 0) reasons.push(`From ${sharedStudios[0].name}`);
  const sharedMechanics = a.mechanics.filter((mechanic) => b.mechanics.includes(mechanic));
  if (sharedMechanics.length > 0)
    reasons.push(`${sharedMechanics.length} shared mechanic${sharedMechanics.length > 1 ? 's' : ''}`);
  return reasons;
}

/**
 * Weighted shared attributes: studio 4, genre 3, mechanic 2, platform 1.
 * Ranks explicit candidates against a source game — the caller decides
 * where candidates come from (seed catalog, provider genre query, …).
 */
export function rankRelatedGames(source: Game, candidates: Game[], limit = 4): RelatedGame[] {
  return candidates
    .filter((game) => game.id !== source.id)
    .map((game) => {
      const sharedGenres = source.genres.filter((genre) =>
        game.genres.some((other) => other.slug === genre.slug),
      ).length;
      const sharedStudios = source.developers.filter((studio) =>
        game.developers.some((other) => other.slug === studio.slug),
      ).length;
      const sharedPlatforms = source.platforms.filter((platform) =>
        game.platforms.some((other) => other.slug === platform.slug),
      ).length;
      const sharedMechanics = source.mechanics.filter((mechanic) =>
        game.mechanics.includes(mechanic),
      ).length;
      return {
        game,
        score: sharedStudios * 4 + sharedGenres * 3 + sharedMechanics * 2 + sharedPlatforms,
        reasons: explainRelation(source, game),
      };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.game.title.localeCompare(b.game.title))
    .slice(0, clampLimit(limit, 4));
}
