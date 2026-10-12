import type { Game, GameGenre, GamePlatform, GameStudio } from './types/game';

/**
 * Runtime validation at the data-access boundary.
 * Provider payloads (and seed entries) must pass through here before
 * entering the domain. TypeScript types alone do not validate I/O.
 */

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const URL_PATTERN = /^https?:\/\/[^\s]+$/i;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toNullableString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string');
}

function isValidDate(value: string): boolean {
  if (!DATE_PATTERN.test(value)) return false;
  const time = Date.parse(`${value}T00:00:00Z`);
  return Number.isNaN(time) === false;
}

function parseNamedList<T extends { id: number; name: string; slug: string }>(
  value: unknown,
  make: (entry: { id: number; name: string; slug: string }) => T,
): T[] | null {
  if (value === undefined) return [];
  if (!Array.isArray(value)) return null;
  const out: T[] = [];
  for (const entry of value) {
    if (!isRecord(entry)) return null;
    if (typeof entry.id !== 'number' || typeof entry.name !== 'string' || entry.name.length === 0) {
      return null;
    }
    if (!isValidGameSlug(entry.slug)) return null;
    out.push(make({ id: entry.id, name: entry.name, slug: entry.slug }));
  }
  return out;
}
function isValidImageUrl(value: string | null): boolean {
  if (value === null) return true;
  return URL_PATTERN.test(value) || value.startsWith('/');
}

export function isValidGameSlug(slug: unknown): slug is string {
  return typeof slug === 'string' && slug.length > 0 && slug.length <= 120 && SLUG_PATTERN.test(slug);
}

export function parseGame(value: unknown): Game | null {
  if (!isRecord(value)) return null;

  const { id, slug, title, summary, coverImage, screenshots } = value;
  if (typeof id !== 'string' || id.length === 0) return null;
  if (!isValidGameSlug(slug)) return null;
  if (typeof title !== 'string' || title.length === 0) return null;

  const cover = toNullableString(coverImage);
  if (!isValidImageUrl(cover)) return null;

  const source = value.source;
  if (!isRecord(source)) return null;
  if (typeof source.provider !== 'string' || source.provider.length === 0) return null;
  if (typeof source.externalId !== 'string' || source.externalId.length === 0) return null;
  const updatedAt = source.updatedAt;
  if (updatedAt !== null && updatedAt !== undefined && typeof updatedAt !== 'string') return null;

  const releases = Array.isArray(value.releases) ? value.releases : [];
  const parsedReleases: Game['releases'] = [];
  for (const entry of releases) {
    if (!isRecord(entry)) return null;
    const platformId = entry.platformId;
    if (platformId !== null && typeof platformId !== 'number') return null;
    const date = entry.date;
    if (date !== null && (typeof date !== 'string' || !isValidDate(date))) return null;
    const precision = entry.precision;
    if (precision !== 'day' && precision !== 'month' && precision !== 'year' && precision !== 'unknown') {
      return null;
    }
    const status = entry.status;
    if (status !== 'announced' && status !== 'released' && status !== 'delayed') {
      return null;
    }
    parsedReleases.push({
      platformId,
      date,
      precision,
      status,
    });
  }

  const genres = parseNamedList<GameGenre>(value.genres, (entry) => entry);
  const platforms = parseNamedList<GamePlatform>(value.platforms, (entry) => entry);
  const developers = parseNamedList<GameStudio>(value.developers, (entry) => entry);
  const publishers = parseNamedList<GameStudio>(value.publishers, (entry) => entry);
  if (genres === null || platforms === null || developers === null || publishers === null) {
    return null;
  }

  return {
    id,
    slug,
    title,
    summary: toNullableString(summary),
    coverImage: cover,
    screenshots: toStringArray(screenshots),
    genres,
    platforms,
    developers,
    publishers,
    releases: parsedReleases,
    mechanics: toStringArray(value.mechanics),
    source: {
      provider: source.provider,
      externalId: source.externalId,
      updatedAt: typeof updatedAt === 'string' ? updatedAt : null,
    },
  };
}
