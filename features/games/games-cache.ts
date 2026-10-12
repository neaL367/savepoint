/**
 * Feature-local cache contract for `games`.
 * Pure tag/key identities — no Next.js imports here.
 * Queries, (future) actions, and route handlers import from this file
 * so a tag spelling cannot drift between a read and its invalidation.
 */

export const GAMES_CATALOG_TAG = 'games';
export const GAMES_SEARCH_TAG = 'games-search';
export const GAMES_UPCOMING_TAG = 'games-upcoming';

export function gameTag(slug: string): string {
  return `game:${slug}`;
}

export function upcomingTag(platform: string | null): string {
  return platform === null ? GAMES_UPCOMING_TAG : `${GAMES_UPCOMING_TAG}:${platform}`;
}
