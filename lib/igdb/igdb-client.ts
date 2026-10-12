import 'server-only';

import { ZodError } from 'zod';

import { ProviderError } from './igdb-errors';
import {
  parseIgdbGameDetail,
  parseIgdbGames,
  parseIgdbNamedList,
  parseIgdbToken,
  type IgdbGameDetail,
  type IgdbGameListItem,
  type IgdbNamed,
} from './igdb-schema';

/**
 * Server-only IGDB HTTP layer. Owns Twitch OAuth, Apicalypse queries, and
 * error normalization. Returns validated provider-shaped data — mapping to
 * the Savepoint domain happens in `features/games/games-mapper.ts`.
 *
 * Rate-limit policy: a 429 throws immediately with no retry. Token handling:
 * the client-credentials token is cached in memory until shortly before
 * expiry; a single 401 refreshes it once and retries the request once.
 * That retry is auth recovery, not data polling.
 */

const TWITCH_TOKEN_URL = 'https://id.twitch.tv/oauth2/token';
const IGDB_BASE_URL = 'https://api.igdb.com/v4';
const REQUEST_TIMEOUT_MS = 8000;
const TOKEN_EXPIRY_SKEW_MS = 60_000;

let tokenCache: { token: string; expiresAt: number } | null = null;

function credentials(): { clientId: string; clientSecret: string } {
  const clientId = process.env.TWITCH_CLIENT_ID;
  const clientSecret = process.env.TWITCH_CLIENT_SECRET;
  if (typeof clientId !== 'string' || clientId.length === 0) {
    throw new ProviderError(
      'unauthorized',
      'TWITCH_CLIENT_ID is missing. Add it to .env.local (see .env.example).',
    );
  }
  if (typeof clientSecret !== 'string' || clientSecret.length === 0) {
    throw new ProviderError(
      'unauthorized',
      'TWITCH_CLIENT_SECRET is missing. Add it to .env.local (see .env.example).',
    );
  }
  return { clientId, clientSecret };
}

async function accessToken(): Promise<{ token: string; clientId: string }> {
  const { clientId, clientSecret } = credentials();
  if (tokenCache && Date.now() < tokenCache.expiresAt) return { token: tokenCache.token, clientId };

  const url = new URL(TWITCH_TOKEN_URL);
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('client_secret', clientSecret);
  url.searchParams.set('grant_type', 'client_credentials');

  let response: Response;
  try {
    response = await fetch(url.toString(), {
      method: 'POST',
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'TimeoutError') {
      throw new ProviderError('timeout', 'Twitch token request timed out.');
    }
    throw new ProviderError('unavailable', 'Twitch token request failed.');
  }
  if (response.status === 400 || response.status === 401 || response.status === 403) {
    throw new ProviderError('unauthorized', 'Twitch rejected the IGDB credentials.');
  }
  if (!response.ok) {
    throw new ProviderError('unavailable', `Twitch responded with status ${response.status}.`);
  }

  let json: unknown;
  try {
    json = (await response.json()) as unknown;
  } catch {
    throw new ProviderError('malformed', 'Twitch returned invalid JSON.');
  }
  try {
    const parsed = parseIgdbToken(json);
    tokenCache = {
      token: parsed.access_token,
      expiresAt: Date.now() + parsed.expires_in * 1000 - TOKEN_EXPIRY_SKEW_MS,
    };
    return { token: parsed.access_token, clientId };
  } catch (error) {
    if (error instanceof ZodError) throw new ProviderError('malformed', 'Twitch token failed validation.');
    throw error;
  }
}

async function igdbPost(endpoint: string, body: string, retryOnAuth = true): Promise<unknown> {
  const { token, clientId } = await accessToken();

  let response: Response;
  try {
    response = await fetch(`${IGDB_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Client-ID': clientId,
        Authorization: `Bearer ${token}`,
        'Content-Type': 'text/plain',
      },
      body,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'TimeoutError') {
      throw new ProviderError('timeout', `IGDB request timed out (${endpoint}).`);
    }
    throw new ProviderError('unavailable', `IGDB request failed (${endpoint}).`);
  }

  if (response.status === 401 && retryOnAuth) {
    tokenCache = null;
    return igdbPost(endpoint, body, false);
  }
  if (response.status === 401 || response.status === 403) {
    throw new ProviderError('unauthorized', 'IGDB rejected the access token.');
  }
  if (response.status === 429) {
    throw new ProviderError('rate-limited', 'IGDB rate limit reached; not retrying.');
  }
  if (!response.ok) {
    throw new ProviderError('malformed', `IGDB rejected the query (status ${response.status}).`);
  }

  try {
    return (await response.json()) as unknown;
  } catch {
    throw new ProviderError('malformed', 'IGDB returned invalid JSON.');
  }
}

/** Fields for cards and listings: identity, art, taxonomy, releases. */
export const IGDB_LIST_FIELDS = [
  'name',
  'slug',
  'summary',
  'cover.url',
  'genres.id',
  'genres.name',
  'genres.slug',
  'platforms.id',
  'platforms.name',
  'platforms.slug',
  'release_dates.date',
  'release_dates.human',
  'release_dates.m',
  'release_dates.y',
  'release_dates.platform',
  'first_release_date',
  'updated_at',
].join(',');

/** Detail adds studios and screenshots; still a single request. */
export const IGDB_DETAIL_FIELDS = [
  IGDB_LIST_FIELDS,
  'involved_companies.company.id',
  'involved_companies.company.name',
  'involved_companies.company.slug',
  'involved_companies.developer',
  'involved_companies.publisher',
  'screenshots.url',
].join(',');

function asMalformed(what: string): ProviderError {
  return new ProviderError('malformed', `IGDB ${what} payload failed validation.`);
}

export async function queryIgdbGames(apicalypse: string): Promise<IgdbGameListItem[]> {
  const json = await igdbPost('/games', apicalypse);
  try {
    return parseIgdbGames(json);
  } catch (error) {
    if (error instanceof ZodError) throw asMalformed('games');
    throw error;
  }
}

export async function queryIgdbGameDetail(apicalypse: string): Promise<IgdbGameDetail | null> {
  const json = await igdbPost('/games', apicalypse);
  let games: IgdbGameListItem[];
  try {
    games = parseIgdbGames(json);
  } catch (error) {
    if (error instanceof ZodError) throw asMalformed('game detail');
    throw error;
  }
  if (games.length === 0) return null;
  try {
    return parseIgdbGameDetail(games[0]);
  } catch (error) {
    if (error instanceof ZodError) throw asMalformed('game detail');
    throw error;
  }
}

async function queryIgdbNamed(endpoint: '/genres' | '/platforms'): Promise<IgdbNamed[]> {
  const json = await igdbPost(endpoint, 'fields id,name,slug; limit 500;');
  try {
    return parseIgdbNamedList(json);
  } catch (error) {
    if (error instanceof ZodError) throw asMalformed(endpoint.slice(1));
    throw error;
  }
}

export async function fetchIgdbGenres(): Promise<IgdbNamed[]> {
  return queryIgdbNamed('/genres');
}

export async function fetchIgdbPlatforms(): Promise<IgdbNamed[]> {
  return queryIgdbNamed('/platforms');
}
